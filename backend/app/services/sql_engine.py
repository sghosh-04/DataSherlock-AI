import sqlite3
import pandas as pd
from typing import Dict, Any, List
from app.core.azure_clients import query_llm
from app.core.config import settings

class SQLEngine:
    def execute_sql(self, df: pd.DataFrame, sql_query: str) -> Dict[str, Any]:
        # Connect to an in-memory SQLite DB
        conn = sqlite3.connect(":memory:")
        
        # Load the dataframe
        df.to_sql("dataset", conn, index=False)
        cursor = conn.cursor()
        
        try:
            cursor.execute(sql_query)
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            
            # Formulate a brief automatic statistical insight summary
            row_count = len(rows)
            insight = f"Query returned {row_count} rows across {len(columns)} fields. "
            if row_count > 0:
                # Analyze numeric values in the first column to add context
                first_col = [r[0] for r in rows if isinstance(r[0], (int, float))]
                if first_col:
                    avg_val = sum(first_col) / len(first_col)
                    insight += f"Numerical average of the primary column is {avg_val:,.2f}."
            
            return {
                "columns": columns,
                "rows": [list(r) for r in rows],
                "insight": insight,
                "status": "success"
            }
        except Exception as e:
            return {
                "columns": [],
                "rows": [],
                "insight": f"SQL syntax evaluation failed: {str(e)}",
                "status": "error"
            }
        finally:
            conn.close()

    def translate_prompt(self, df: pd.DataFrame, prompt: str) -> Dict[str, Any]:
        prompt_lower = prompt.lower()
        cols = list(df.columns)
        
        # Determine some field name matches for mock translation
        num_col = next((c for c in cols if "revenue" in c.lower() or "sales" in c.lower() or "profit" in c.lower() or "price" in c.lower()), cols[0])
        dim_col = next((c for c in cols if "region" in c.lower() or "product" in c.lower() or "category" in c.lower()), cols[-1])

        if settings.MOCK_AZURE:
            # High-fidelity mock SQL queries based on standard prompts
            if "top 5" in prompt_lower or "best" in prompt_lower:
                sql = f"SELECT * FROM dataset ORDER BY `{num_col}` DESC LIMIT 5"
            elif "average" in prompt_lower or "mean" in prompt_lower:
                sql = f"SELECT `{dim_col}`, AVG(`{num_col}`) as Average_{num_col} FROM dataset GROUP BY `{dim_col}`"
            elif "count" in prompt_lower or "total" in prompt_lower:
                sql = f"SELECT `{dim_col}`, COUNT(*) as Record_Count FROM dataset GROUP BY `{dim_col}`"
            elif "compare" in prompt_lower:
                sql = f"SELECT `{dim_col}`, SUM(`{num_col}`) as Total_{num_col} FROM dataset GROUP BY `{dim_col}` ORDER BY Total_{num_col} DESC"
            else:
                sql = f"SELECT * FROM dataset LIMIT 10"
                
            return {"query": sql}

        # Live Azure OpenAI translation
        schema_desc = ", ".join([f"`{c}` ({str(df[c].dtype)})" for c in cols])
        llm_prompt = f"""
        Convert this user prompt into a valid SQLite SQL statement.
        The database table is named: "dataset"
        Available schema: {schema_desc}
        User prompt: "{prompt}"
        
        Return ONLY the raw SQL string. Do not include markdown code block syntax.
        """
        
        response = query_llm(llm_prompt, "You are a text-to-SQL translator for SQLite databases.")
        if response:
            sql = response.strip()
            if "```sql" in sql:
                sql = sql.split("```sql")[1].split("```")[0]
            elif "```" in sql:
                sql = sql.split("```")[1].split("```")[0]
            return {"query": sql.strip()}
            
        return {"query": "SELECT * FROM dataset LIMIT 10"}
