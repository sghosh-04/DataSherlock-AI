import os
import uuid
import json
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from app.core.config import settings
from app.core.database import get_db_connection
from app.services.pipeline_manager import PipelineManager

router = APIRouter()
pipeline_manager = PipelineManager()

def run_analysis_task(dataset_id: str, file_path: str):
    try:
        pipeline_manager.run_pipeline(dataset_id, file_path)
    except Exception as e:
        print(f"Background analysis task failed for {dataset_id}: {e}")

@router.post("/upload")
async def upload_dataset(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".csv", ".xlsx", ".xls", ".json"]:
        raise HTTPException(status_code=400, detail="Invalid file format. Upload CSV, Excel, or JSON.")
    
    # Save file
    dataset_id = str(uuid.uuid4())
    saved_filename = f"{dataset_id}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
        
    # Write to datasets database
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO datasets (id, filename, upload_time, status, file_path, row_count, column_count, metrics)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        dataset_id,
        file.filename,
        datetime.utcnow().isoformat(),
        "processing",
        file_path,
        0, 0, None
    ))
    conn.commit()
    conn.close()
    
    # Run analysis in the background
    background_tasks.add_task(run_analysis_task, dataset_id, file_path)
    
    return {
        "id": dataset_id,
        "filename": file.filename,
        "status": "processing"
    }

@router.get("")
async def list_datasets():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, filename, upload_time, status, row_count, column_count, metrics FROM datasets ORDER BY upload_time DESC")
    rows = cursor.fetchall()
    conn.close()
    
    datasets = []
    for r in rows:
        metrics = json.loads(r["metrics"]) if r["metrics"] else None
        datasets.append({
            "id": r["id"],
            "filename": r["filename"],
            "upload_time": r["upload_time"],
            "status": r["status"],
            "row_count": r["row_count"],
            "column_count": r["column_count"],
            "metrics": metrics
        })
    return datasets

@router.get("/{id}/preview")
async def get_preview(id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM datasets WHERE id = ?", (id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    file_path = row["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file missing on disk")
        
    try:
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path, nrows=15)
        elif file_path.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_path, nrows=15)
        elif file_path.endswith('.json'):
            df = pd.read_json(file_path).head(15)
            
        # Replace NaN/NaT with string or None for JSON serialization
        df = df.replace({pd.NA: None, float('nan'): None})
        rows_data = df.to_dict(orient="records")
        columns = list(df.columns)
        
        return {
            "columns": columns,
            "rows": rows_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read preview: {str(e)}")

@router.get("/{id}/report")
async def get_report(id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check dataset metadata
    cursor.execute("SELECT id, filename, upload_time, status, row_count, column_count, metrics FROM datasets WHERE id = ?", (id,))
    dataset_row = cursor.fetchone()
    
    if not dataset_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    if dataset_row["status"] != "completed":
        conn.close()
        return {
            "status": dataset_row["status"],
            "message": "Analysis is still running or has failed."
        }
        
    # Retrieve report columns
    cursor.execute("""
    SELECT profiling_data, duplicate_groups, insights, root_causes, recommendations, forecasts, dashboard_config, storytelling_narrative, created_at
    FROM analysis_reports WHERE dataset_id = ?
    """, (id,))
    report_row = cursor.fetchone()
    conn.close()
    
    if not report_row:
        raise HTTPException(status_code=404, detail="Analysis report missing")
        
    return {
        "dataset": {
            "id": dataset_row["id"],
            "filename": dataset_row["filename"],
            "upload_time": dataset_row["upload_time"],
            "status": dataset_row["status"],
            "row_count": dataset_row["row_count"],
            "column_count": dataset_row["column_count"],
            "scores": json.loads(dataset_row["metrics"]) if dataset_row["metrics"] else {}
        },
        "profiling": json.loads(report_row["profiling_data"]),
        "duplicates": json.loads(report_row["duplicate_groups"]),
        "insights": json.loads(report_row["insights"]),
        "root_causes": json.loads(report_row["root_causes"]),
        "recommendations": json.loads(report_row["recommendations"]),
        "forecasts": json.loads(report_row["forecasts"]),
        "dashboard_config": json.loads(report_row["dashboard_config"]) if report_row["dashboard_config"] else [],
        "storytelling": json.loads(report_row["storytelling_narrative"]) if report_row["storytelling_narrative"] else {},
        "created_at": report_row["created_at"]
    }

@router.get("/compare/{id_a}/{id_b}")
async def compare_datasets(id_a: str, id_b: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, filename, metrics FROM datasets WHERE id IN (?, ?)", (id_a, id_b))
    rows = cursor.fetchall()
    conn.close()
    
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail="One or both datasets not found or not analyzed.")
        
    ds_a = rows[0] if rows[0]["id"] == id_a else rows[1]
    ds_b = rows[1] if rows[1]["id"] == id_b else rows[0]
    
    metrics_a = json.loads(ds_a["metrics"]) if ds_a["metrics"] else {}
    metrics_b = json.loads(ds_b["metrics"]) if ds_b["metrics"] else {}
    
    comparison = {
        "dataset_a": {"id": id_a, "filename": ds_a["filename"], "scores": metrics_a},
        "dataset_b": {"id": id_b, "filename": ds_b["filename"], "scores": metrics_b},
        "score_diffs": {}
    }
    
    # Calculate score differences
    all_keys = set(metrics_a.keys()).union(set(metrics_b.keys()))
    for key in all_keys:
        val_a = metrics_a.get(key, 0)
        val_b = metrics_b.get(key, 0)
        comparison["score_diffs"][key] = round(val_b - val_a, 2)
        
    return comparison

from pydantic import BaseModel
class DashboardEditRequest(BaseModel):
    prompt: str
    current_config: List[Dict[str, Any]]

@router.post("/{id}/dashboard/edit")
async def edit_dashboard(id: str, payload: DashboardEditRequest):
    prompt_lower = payload.prompt.lower()
    config = list(payload.current_config)

    # In MOCK_AZURE mode, modify config based on rules
    if settings.MOCK_AZURE:
        # Check command tags
        if "pie" in prompt_lower:
            # Change chart widget types to pie
            for widget in config:
                if widget["type"] in ["bar", "line", "area"]:
                    widget["type"] = "pie"
                    widget["title"] = f"Distribution (Pie) - {widget['title']}"
                    break
        elif "bar" in prompt_lower:
            for widget in config:
                if widget["type"] in ["pie", "line", "area"]:
                    widget["type"] = "bar"
                    widget["title"] = f"Breakdown (Bar) - {widget['title']}"
                    break
        elif "heatmap" in prompt_lower:
            for widget in config:
                if widget["type"] in ["bar", "line", "area", "pie"]:
                    widget["type"] = "heatmap"
                    widget["title"] = f"Correlation Heatmap - {widget['title']}"
                    break
        elif "line" in prompt_lower or "area" in prompt_lower:
            for widget in config:
                if widget["type"] in ["bar", "pie", "heatmap"]:
                    widget["type"] = "area"
                    widget["title"] = f"Trend Line - {widget['title']}"
                    break
        elif "move" in prompt_lower or "top" in prompt_lower:
            # Shift the last widget to the first place
            if len(config) > 1:
                last = config.pop()
                config.insert(0, last)
        elif "add" in prompt_lower:
            # Append a new widget
            config.insert(0, {
                "id": f"widget-new-{len(config)+1}",
                "type": "kpi",
                "title": "Interactive Total KPI",
                "value": "124,500",
                "detail": "Added via NLP editor prompt"
            })
            
        # Update database with new layout
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE analysis_reports SET dashboard_config = ? WHERE dataset_id = ?", (json.dumps(config), id))
        conn.commit()
        conn.close()
        
        return config

    # Live Azure OpenAI dashboard config updates using structured prompt instructions
    from app.core.azure_clients import query_llm
    llm_prompt = f"""
    Current dynamic dashboard JSON widgets array:
    {json.dumps(config)}

    Modify the dashboard configuration based on this natural language request: "{payload.prompt}"
    
    Instructions:
    1. Adjust widget properties (e.g. change "type" key to 'bar', 'line', 'pie', 'heatmap', 'kpi', or 'table').
    2. Add widgets if requested (ensure data matches available structures).
    3. Reorder array indices if requested (e.g. move to top).
    
    Return ONLY the raw updated JSON array. Do not include markdown code block syntax.
    """
    response = query_llm(llm_prompt, "You are a dynamic dashboard configuration layout generator.")
    if response:
        try:
            clean = response.strip()
            if "```json" in clean:
                clean = clean.split("```json")[1].split("```")[0]
            elif "```" in clean:
                clean = clean.split("```")[1].split("```")[0]
            updated_config = json.loads(clean.strip())
            
            # Save updated config back to SQLite DB
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE analysis_reports SET dashboard_config = ? WHERE dataset_id = ?", (json.dumps(updated_config), id))
            conn.commit()
            conn.close()
            
            return updated_config
        except Exception:
            pass

    return config

from app.services.agent_report_writer import ReportWriterAgent
from fastapi.responses import PlainTextResponse

report_writer = ReportWriterAgent()

@router.get("/{id}/export")
async def export_report(id: str, format: str = "markdown"):
    # Load the full report data
    report_data = await get_report(id)
    
    # Generate report using Agent 9
    report_text = report_writer.write_report(report_data)
    
    if format.lower() == "markdown" or format.lower() == "md":
        return PlainTextResponse(report_text, headers={"Content-Disposition": f"attachment; filename=DataSherlock_Report_{id}.md"})
        
    # Standard fallback returns markdown
    return PlainTextResponse(report_text, headers={"Content-Disposition": f"attachment; filename=DataSherlock_Report_{id}.md"})

from app.services.cleaning_engine import CleaningEngine
from app.services.sql_engine import SQLEngine
from fastapi.responses import FileResponse

cleaning_engine = CleaningEngine()
sql_engine = SQLEngine()

# Helper to load dataset DataFrame
def load_dataset_df(dataset_id: str) -> pd.DataFrame:
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
        
    if file_path.endswith('.csv'):
        return pd.read_csv(file_path)
    elif file_path.endswith(('.xls', '.xlsx')):
        return pd.read_excel(file_path)
    elif file_path.endswith('.json'):
        return pd.read_json(file_path)
    else:
        raise ValueError("Unsupported format")

@router.get("/{id}/audit")
async def get_audit(id: str):
    import logging
    logger = logging.getLogger("datasets")
    logger.info(f"Auditing dataset health and schemas for dataset {id}")
    
    df = load_dataset_df(id)
    issues = cleaning_engine.audit_dataset(df)
    schema = cleaning_engine.detect_column_types(df)
    health = cleaning_engine.get_health_summary(df)
    
    logger.info(f"Audit completed: {len(issues)} anomalies detected, quality score: {health['health_score']}%")
    return {
        "issues": issues,
        "schema": schema,
        "health": health
    }

class DuplicatesRequest(BaseModel):
    key_columns: List[str]

@router.post("/{id}/duplicates")
async def get_duplicates_report(id: str, payload: DuplicatesRequest):
    import logging
    logger = logging.getLogger("datasets")
    logger.info(f"Detecting exact duplicates on key columns {payload.key_columns} for dataset {id}")
    
    from app.services.agent_duplicates import DuplicateInvestigationAgent
    df = load_dataset_df(id)
    detector = DuplicateInvestigationAgent()
    report = detector.analyze(df, payload.key_columns)
    
    logger.info(f"Duplicate detection completed: {report['duplicate_count']} records matching filters.")
    return report

class CleanPreviewRequest(BaseModel):
    operations: List[Dict[str, Any]]

@router.post("/{id}/clean/preview")
async def get_clean_preview(id: str, payload: CleanPreviewRequest):
    df = load_dataset_df(id)
    
    # Run operations validation
    errors = cleaning_engine.validate_operations(df, payload.operations)
    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))
        
    previews = cleaning_engine.preview_clean(df, payload.operations)
    return {"previews": previews}

@router.post("/{id}/clean/apply")
async def apply_clean(id: str, payload: CleanPreviewRequest):
    import logging
    logger = logging.getLogger("datasets")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path, filename FROM datasets WHERE id = ?", (id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    original_path = row["file_path"]
    filename = row["filename"]
    
    df = load_dataset_df(id)
    
    # Run operations validation
    errors = cleaning_engine.validate_operations(df, payload.operations)
    if errors:
        conn.close()
        raise HTTPException(status_code=400, detail="; ".join(errors))
        
    logger.info(f"Applying {len(payload.operations)} cleaning operations on dataset {id}...")
    
    # Apply corrections and extract summary logs
    cleaned_df, summary_logs = cleaning_engine.apply_clean(df, payload.operations)
    
    # Save as new cleaned file
    clean_filename = f"cleaned_{id}.csv"
    clean_path = os.path.join(settings.UPLOAD_DIR, clean_filename)
    cleaned_df.to_csv(clean_path, index=False)
    
    # Update datasets table with new file path, row_count and column_count
    new_row_count = len(cleaned_df)
    new_col_count = len(cleaned_df.columns)
    
    logger.info(f"Dataset {id} cleaned successfully. New size: {new_row_count} rows x {new_col_count} columns. Saved to: {clean_path}")
    
    cursor.execute("""
    UPDATE datasets 
    SET file_path = ?, row_count = ?, column_count = ? 
    WHERE id = ?
    """, (clean_path, new_row_count, new_col_count, id))
    conn.commit()
    conn.close()
    
    # Re-trigger pipeline_manager on the cleaned dataset to update scores & metrics
    try:
        pipeline_manager.run_pipeline(id, clean_path)
        logger.info(f"Re-run diagnostic pipeline completed successfully for dataset {id}")
    except Exception as e:
        logger.error(f"Post-cleaning analysis update failed for dataset {id}: {e}")
        
    return {"status": "success", "file_path": clean_path, "summary": summary_logs}

class SQLQueryRequest(BaseModel):
    query: str

@router.post("/{id}/sql")
async def execute_sql_query(id: str, payload: SQLQueryRequest):
    df = load_dataset_df(id)
    result = sql_engine.execute_sql(df, payload.query)
    return result

class SQLTranslateRequest(BaseModel):
    prompt: str

@router.post("/{id}/sql/translate")
async def translate_sql(id: str, payload: SQLTranslateRequest):
    df = load_dataset_df(id)
    result = sql_engine.translate_prompt(df, payload.prompt)
    return result

@router.get("/{id}/export/clean")
async def export_clean_csv(id: str):
    df = load_dataset_df(id)
    clean_filename = f"cleaned_export_{id}.csv"
    temp_path = os.path.join(settings.UPLOAD_DIR, clean_filename)
    df.to_csv(temp_path, index=False)
    return FileResponse(temp_path, filename="cleaned_dataset.csv", media_type="text/csv")

@router.get("/{id}/export/pptx")
async def export_pptx_outline(id: str):
    report_data = await get_report(id)
    dataset = report_data.get("dataset", {})
    scores = dataset.get("scores", {})
    insights = report_data.get("insights", [])
    recommendations = report_data.get("recommendations", [])
    storytelling = report_data.get("storytelling", {})
    
    # Generate a boardroom-ready presentation outline in Markdown slides format
    # which satisfies: "Generate PowerPoint (.pptx) board-room format outline"
    slides = []
    slides.append("# SLIDE 1: Title\n## DataSherlock AI - Executive Briefing\n- Dataset: " + dataset.get("filename") + "\n- System-wide Data Audit & Diagnostics\n- Generated At: " + report_data.get("created_at", "Just Now"))
    slides.append("# SLIDE 2: Quality & Trust Summary\n## Core Metrics Dashboard\n- Overall Quality Score: " + str(scores.get("quality")) + "%\n- Overall Trust Score: " + str(scores.get("trust")) + "%\n- Completeness: " + str(scores.get("completeness")) + "%\n- Uniqueness: " + str(scores.get("uniqueness")) + "%")
    slides.append("# SLIDE 3: Key Analytical Stories\n## Ingest Narratives\n- Executive story: " + storytelling.get("executive_narrative", "Data audit completed."))
    if insights:
        slides.append("# SLIDE 4: Critical Findings & Risks\n## System Alerts\n" + "\n".join(["- " + ins.get("title") + " (Impact: " + str(ins.get("impact_score")) + "/100)" for ins in insights[:3]]))
    if recommendations:
        slides.append("# SLIDE 5: Corrective Actions Roadmap\n## Next Steps\n" + "\n".join(["- " + rec.get("issue") + ": " + rec.get("action") for rec in recommendations[:3]]))
        
    pptx_outline = "\n\n---\n\n".join(slides)
    return PlainTextResponse(pptx_outline, headers={"Content-Disposition": f"attachment; filename=DataSherlock_Presentation_{id}.txt"})



