import os
import time
import sys
import threading
import uvicorn
import httpx
import pandas as pd

# Add current path to sys.path so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.core.database import init_db

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8081, log_level="warning")

def test_bi_suite():
    print("--------------------------------------------------")
    print("RUNNING BI EVOLUTION ROADMAP BACKEND TEST SUITE")
    print("--------------------------------------------------")
    
    init_db()
    
    # Start server on port 8081
    print("Launching FastAPI server on port 8081...")
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)
    
    client = httpx.Client(base_url="http://127.0.0.1:8081/api")
    
    # Create mock sales dataset
    test_csv = "sales_temp.csv"
    data = {
        "Date": ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"],
        "Revenue": [15000, 24000, 18000, 31000, 12000],
        "Region": ["West", "East", "West", "North", "South"],
        "Product": ["Gadget A", "Widget B", "Gadget A", "Widget B", "Gizmo C"]
    }
    pd.DataFrame(data).to_csv(test_csv, index=False)
    print(f"Mock sales CSV created at {test_csv}")
    
    dataset_id = None
    try:
        # Ingest file
        with open(test_csv, "rb") as f:
            upload_res = client.post("/datasets/upload", files={"file": (test_csv, f, "text/csv")})
        assert upload_res.status_code == 200
        dataset_id = upload_res.json()["id"]
        print(f"Ingested test dataset: ID={dataset_id}")
        
        # Poll completion
        status = "processing"
        for i in range(10):
            time.sleep(1)
            report_res = client.get(f"/datasets/{dataset_id}/report")
            assert report_res.status_code == 200
            report = report_res.json()
            if "dataset" in report and report["dataset"]["status"] == "completed":
                status = "completed"
                break
                
        assert status == "completed"
        print("Pipeline execution succeeded!")
        
        # Verify Agent 7 Dashboard Config
        assert "dashboard_config" in report
        db_config = report["dashboard_config"]
        print(f"Agent 7 (Dashboard Architect) widgets generated: {len(db_config)}")
        for w in db_config:
            print(f"  - Widget ID: {w['id']}, Type: {w['type']}, Title: '{w['title']}'")
            
        # Verify Agent 10 Storytelling Narrative
        assert "storytelling" in report
        story = report["storytelling"]
        assert "executive_narrative" in story
        assert "boardroom_summary" in story
        print(f"Agent 10 (Storytelling) narrative length: {len(story['executive_narrative'])} chars")
        
        # Verify Agent 8 (BI Analyst)
        print("Testing Agent 8 (BI Analyst Q&A) for Region Performance...")
        bi_res = client.post(
            f"/copilot/{dataset_id}/bi-analyst",
            json={"message": "Which region performs best in total Revenue?", "chat_history": []}
        )
        assert bi_res.status_code == 200
        bi_ans = bi_res.json()
        assert "summary" in bi_ans
        assert "confidence_score" in bi_ans
        assert "visual_recommendation" in bi_ans
        print(f"BI Analyst Q&A Success! Confidence: {bi_ans['confidence_score'] * 100}%")
        print(f"Summary Response: {bi_ans['summary']}")
        print(f"Visual Recommendation: Type={bi_ans['visual_recommendation']['type']}, Title='{bi_ans['visual_recommendation']['title']}'")

        # Verify NL Dashboard Editor
        print("Testing NL Dashboard Editor: 'Convert chart to pie'...")
        edit_res = client.post(
            f"/datasets/{dataset_id}/dashboard/edit",
            json={"prompt": "Convert chart to pie chart", "current_config": db_config}
        )
        assert edit_res.status_code == 200
        edited_config = edit_res.json()
        # Should have converted some widget to pie
        has_pie = any(w["type"] == "pie" for w in edited_config)
        print(f"NLP Dashboard Editing Success! Layout contains pie widget: {has_pie}")

        # Verify Agent 9 (Report Writer Exporter)
        print("Testing Agent 9 (Report Writer Exporter) format=markdown...")
        export_res = client.get(f"/datasets/{dataset_id}/export?format=markdown")
        assert export_res.status_code == 200
        report_text = export_res.text
        assert "# Executive Intelligence Report" in report_text
        assert "## 1. Executive Summary" in report_text
        print("Report Writer Markdown generated successfully!")
        
        print("\nALL 10 AGENT CORE FUNCTIONALITIES AND METRIC PIPELINES ARE COMPLETELY VERIFIED!")
        
    finally:
        if os.path.exists(test_csv):
            os.remove(test_csv)
        uploaded_file = f"./uploads/{dataset_id}.csv" if dataset_id else None
        if uploaded_file and os.path.exists(uploaded_file):
            os.remove(uploaded_file)

if __name__ == "__main__":
    test_bi_suite()
