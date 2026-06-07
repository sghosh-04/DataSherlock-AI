import pandas as pd
import numpy as np
from typing import Dict, Any, List
from app.core.azure_clients import query_llm
from app.core.config import settings

class BIAnalystAgent:
    def answer_query(self, df: pd.DataFrame, query: str) -> Dict[str, Any]:
        query_lower = query.lower()
        
        # Determine available columns in dataset
        cols = list(df.columns)
        dim_cols = [c for c in cols if str(df[c].dtype) == "object" or df[c].nunique() <= 15]
        metric_cols = [c for c in cols if np.issubdtype(df[c].dtype, np.number)]
        
        # 1. Look for region queries
        region_col = next((c for c in dim_cols if "region" in c.lower() or "city" in c.lower() or "state" in c.lower()), None)
        metric_col = next((c for c in metric_cols if any(m in c.lower() for m in ["revenue", "sales", "amount", "profit", "price"])), (metric_cols[0] if metric_cols else None))

        # Check if we should execute actual Pandas query
        if region_col and metric_col and ("region" in query_lower or "best performing" in query_lower or "compare" in query_lower):
            try:
                # Calculate groupings
                grouped = df.groupby(region_col)[metric_col].sum().reset_index()
                grouped = grouped.sort_values(by=metric_col, ascending=False)
                
                best_region = str(grouped.iloc[0][region_col])
                best_val = float(grouped.iloc[0][metric_col])
                total_val = float(grouped[metric_col].sum())
                pct = (best_val / total_val) * 100
                
                support_metrics = [
                    f"Top Performer: {best_region} (Value: {best_val:,.2f})",
                    f"Market Share: {pct:,.1f}% of total {metric_col}",
                    f"Total {metric_col} Pool: {total_val:,.2f}"
                ]
                
                chart_data = []
                for _, row in grouped.iterrows():
                    chart_data.append({"name": str(row[region_col]), "value": float(row[metric_col])})

                return {
                    "summary": f"According to transaction metrics, the best performing area is **{best_region}** which accumulated {best_val:,.2f} in total {metric_col}. This accounts for {pct:,.1f}% of the entire pool.",
                    "supporting_metrics": support_metrics,
                    "confidence_score": 0.95,
                    "visual_recommendation": {
                        "type": "bar",
                        "title": f"{metric_col} by {region_col}",
                        "xKey": "name",
                        "yKey": "value",
                        "data": chart_data
                    }
                }
            except Exception:
                pass

        # 2. Look for product queries
        product_col = next((c for c in dim_cols if "product" in c.lower() or "item" in c.lower() or "category" in c.lower()), None)
        if product_col and metric_col and ("product" in query_lower or "underperforming" in query_lower or "worst" in query_lower or "item" in query_lower):
            try:
                grouped = df.groupby(product_col)[metric_col].sum().reset_index()
                grouped = grouped.sort_values(by=metric_col, ascending=True) # Ascending for worst/underperforming
                
                worst_prod = str(grouped.iloc[0][product_col])
                worst_val = float(grouped.iloc[0][metric_col])
                best_prod = str(grouped.iloc[-1][product_col])
                best_val = float(grouped.iloc[-1][metric_col])
                
                support_metrics = [
                    f"Worst Performer: {worst_prod} ({metric_col}: {worst_val:,.2f})",
                    f"Best Performer: {best_prod} ({metric_col}: {best_val:,.2f})",
                    f"Performance Spread: {(best_val - worst_val):,.2f} delta gap"
                ]
                
                chart_data = []
                for _, row in grouped.tail(5).iterrows(): # Show top 5
                    chart_data.append({"name": str(row[product_col]), "value": float(row[metric_col])})

                return {
                    "summary": f"Product analysis shows **{worst_prod}** is currently underperforming with a total of {worst_val:,.2f} in {metric_col}. In contrast, the top product is **{best_prod}** generating {best_val:,.2f}.",
                    "supporting_metrics": support_metrics,
                    "confidence_score": 0.92,
                    "visual_recommendation": {
                        "type": "pie",
                        "title": f"Top Products by {metric_col}",
                        "xKey": "name",
                        "yKey": "value",
                        "data": chart_data
                    }
                }
            except Exception:
                pass

        # If live Azure model is configured and we didn't match local templates, use LLM
        if not settings.MOCK_AZURE and settings.AZURE_OPENAI_API_KEY:
            # Let Azure OpenAI generate answer
            prompt = f"""
            Analyze this dataset overview:
            Columns: {cols}
            Metric columns: {metric_cols}
            Dimension columns: {dim_cols}
            
            Answer this user query: "{query}"
            
            Return a JSON object with:
            - "summary": string (the answer text)
            - "supporting_metrics": array of strings (supporting metrics)
            - "confidence_score": float (between 0.0 and 1.0)
            - "visual_recommendation": object with "type" ('bar', 'line', 'pie', or 'kpi'), "title", "xKey", "yKey", and "data" (array of name/value points).
            """
            response = query_llm(prompt, "You are a senior BI analyst expert at querying databases.")
            if response:
                try:
                    clean = response.strip()
                    if "```json" in clean:
                        clean = clean.split("```json")[1].split("```")[0]
                    elif "```" in clean:
                        clean = clean.split("```")[1].split("```")[0]
                    import json
                    return json.loads(clean.strip())
                except Exception:
                    pass

        # Default fallback answer
        val_name = metric_col if metric_col else "entries"
        return {
            "summary": f"Your dataset contains {len(df)} records across columns: `{', '.join(cols)}`.\n\nTo see localized dimensions, select comparing parameters or ask about regions or products specifically.",
            "supporting_metrics": [
                f"Row Volume: {len(df)} rows",
                f"Metric Columns: {len(metric_cols)} detected",
                f"Dimension Columns: {len(dim_cols)} detected"
            ],
            "confidence_score": 0.85,
            "visual_recommendation": {
                "type": "kpi",
                "title": "Dataset Row Count",
                "value": f"{len(df):,}",
                "detail": f"Fields: {len(cols)}"
            }
        }
