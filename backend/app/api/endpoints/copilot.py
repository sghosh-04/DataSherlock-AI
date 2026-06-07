import json
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Dict, Any
from app.core.database import get_db_connection
from app.core.azure_clients import query_llm
from app.core.config import settings

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    chat_history: List[Dict[str, str]] = []

@router.post("/{dataset_id}")
async def copilot_chat(dataset_id: str, payload: ChatRequest = Body(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Fetch report details for context
    cursor.execute("""
    SELECT profiling_data, duplicate_groups, insights, root_causes, recommendations 
    FROM analysis_reports WHERE dataset_id = ?
    """, (dataset_id,))
    report_row = cursor.fetchone()
    
    # Also fetch dataset filename and metrics
    cursor.execute("SELECT filename, metrics FROM datasets WHERE id = ?", (dataset_id,))
    dataset_row = cursor.fetchone()
    conn.close()
    
    if not dataset_row:
        raise HTTPException(status_code=404, detail="Dataset metadata not found")
        
    filename = dataset_row["filename"]
    metrics = json.loads(dataset_row["metrics"]) if dataset_row["metrics"] else {}
    
    if not report_row:
        # If analysis is not run, give default chat back
        return {
            "response": f"I can see '{filename}' is uploaded, but the agent analysis hasn't run or completed. Please wait until analysis is finished before querying details."
        }

    # Extract info for prompt construction
    profile_data = json.loads(report_row["profiling_data"])
    duplicates = json.loads(report_row["duplicate_groups"])
    root_causes = json.loads(report_row["root_causes"])
    recommendations = json.loads(report_row["recommendations"])

    # 2. Build system LLM prompt or run custom mock logic
    user_query = payload.message.lower()
    
    if settings.MOCK_AZURE:
        # High fidelity mock responses based on keywords in user message
        if "why" in user_query or "reason" in user_query or "cause" in user_query:
            cause_strs = [f"- {c['issue']}: {c['root_cause']} (Confidence: {int(c['confidence']*100)}%)" for c in root_causes]
            joined_causes = "\n".join(cause_strs)
            response_text = f"Based on my diagnostic investigation, here are the root causes for the quality issues in **{filename}**:\n\n{joined_causes}\n\nWe recommend tackling the highest confidence issue first to boost your overall scores."
        
        elif "fix" in user_query or "action" in user_query or "recommend" in user_query or "do" in user_query:
            rec_strs = [f"- **{r['issue']}** (Priority: {r['priority']}, Effort: {r['effort']}): {r['action']} (Expected improvement: {r['expected_improvement']})" for r in recommendations]
            joined_recs = "\n".join(rec_strs)
            response_text = f"Here are the recommended corrective actions for **{filename}**:\n\n{joined_recs}\n\nImplementing the priority fixes will raise the Quality Score to above 90%."
            
        elif "duplicate" in user_query or "fuzzy" in user_query or "double" in user_query:
            dup_count = duplicates.get("duplicate_count", 0)
            cols_used = ", ".join(duplicates.get("matching_columns_used", []))
            response_text = f"My Duplicate Investigation Agent scanned the fields: `[{cols_used}]`.\n\nWe found **{dup_count} duplicate records** with fuzzy matching logic. These entries share similar names or emails but have different casing, missing prefixes, or minor typos."
            
        elif "score" in user_query or "quality" in user_query or "metric" in user_query:
            score_summary = "\n".join([f"- **{k.capitalize()}**: {v}%" for k, v in metrics.items()])
            response_text = f"Here are the current data quality parameters for **{filename}**:\n\n{score_summary}\n\nThe overall Trust Score is at **{metrics.get('trust', 0.0)}%**."
            
        else:
            response_text = f"Hello! I am your Data Health Copilot for **{filename}**.\n\nYou can ask me:\n- *'Why is the quality score low?'*\n- *'What are the recommendations to fix this dataset?'*\n- *'Tell me about duplicate records'*.\n\nCurrently, the Quality Score is **{metrics.get('quality', 0.0)}%**."
            
        return {"response": response_text}

    # Live LLM execution
    context_data = {
        "filename": filename,
        "metrics": metrics,
        "root_causes": root_causes,
        "recommendations": recommendations,
        "missing_summary": profile_data.get("summary", {}),
        "columns": list(profile_data.get("columns", {}).keys())
    }
    
    prompt = f"""
    You are the Data Health Copilot. Help the user understand their dataset's quality problems.
    Dataset Context:
    - Filename: {context_data['filename']}
    - Metrics: {context_data['metrics']}
    - Root Causes: {context_data['root_causes']}
    - Recommendations: {context_data['recommendations']}
    - Missing Data Stats: {context_data['missing_summary']}
    
    Chat History:
    {payload.chat_history}
    
    User Query: {payload.message}
    
    Answer the user query clearly, citing the specific dataset details when relevant.
    """
    
    system_prompt = "You are a helpful Data Quality Advisor. Give direct, concise, and action-oriented answers."
    response = query_llm(prompt, system_prompt)
    if not response:
        return {"response": "Sorry, I am currently unable to reach the Azure OpenAI endpoint. Please check connection configurations."}
        
    return {"response": response}

from app.services.agent_bi_analyst import BIAnalystAgent
import os
import pandas as pd

bi_analyst = BIAnalystAgent()

@router.post("/{dataset_id}/bi-analyst")
async def bi_analyst_chat(dataset_id: str, payload: ChatRequest = Body(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM datasets WHERE id = ?", (dataset_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    file_path = row["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file missing on disk")
        
    try:
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_path.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_path)
        elif file_path.endswith('.json'):
            df = pd.read_json(file_path)
        else:
            raise ValueError("Unsupported format")
            
        answer = bi_analyst.answer_query(df, payload.message)
        return answer
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"BI Analyst execution failed: {str(e)}")

