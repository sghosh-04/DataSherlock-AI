import os
import time
import sys
import threading
import uvicorn
import httpx

# Add current path to sys.path so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.core.database import init_db

# Run uvicorn in a background thread
def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8080, log_level="warning")

def test_integration():
    print("Initializing SQLite Database...")
    init_db()

    # Start server
    print("Starting FastAPI Backend Server on port 8080...")
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Wait for server to boot up
    time.sleep(2)
    
    client = httpx.Client(base_url="http://127.0.0.1:8080/api")
    
    # Check Health
    try:
        health = client.get("/health")
        print(f"Health check status: {health.status_code}, body: {health.json()}")
    except Exception as e:
        print(f"Server did not boot correctly: {e}")
        sys.exit(1)
        
    # Create a dummy CSV file to upload
    test_csv = "e2e_test.csv"
    with open(test_csv, "w") as f:
        f.write("id,name,email,phone,region\n")
        f.write("1,John Doe,john@doe.com,+1 (555) 123-4567,West\n")
        f.write("2,Jane Smith,jane@smith.com,123-456-7890,East\n")
        f.write("3,John Doe,john@doe.com,+1 (555) 123-4567,West\n") # Duplicate
        f.write("4,Missing User,,555-111-2222,North\n") # Missing email
        f.write("5,Invalid Phone,invalid@email.com,not-a-phone,South\n") # Inconsistent phone

    print(f"Ingesting dataset: {test_csv}...")
    try:
        # Upload file
        with open(test_csv, "rb") as f:
            upload_res = client.post("/datasets/upload", files={"file": (test_csv, f, "text/csv")})
        
        assert upload_res.status_code == 200
        dataset = upload_res.json()
        dataset_id = dataset["id"]
        print(f"Successfully uploaded dataset: ID={dataset_id}, Status={dataset['status']}")
        
        # Poll for completion (max 10 seconds)
        print("Polling background agent execution pipeline...")
        status = "processing"
        for i in range(10):
            time.sleep(1)
            report_res = client.get(f"/datasets/{dataset_id}/report")
            assert report_res.status_code == 200
            report = report_res.json()
            
            # If it returns a completed status
            if "dataset" in report and report["dataset"]["status"] == "completed":
                status = "completed"
                break
                
        assert status == "completed"
        print("Pipeline execution succeeded!")
        print(f"Scores calculated: {report['dataset']['scores']}")
        
        # Assert key agent fields exist
        assert len(report["insights"]) > 0
        assert len(report["root_causes"]) > 0
        assert len(report["recommendations"]) > 0
        assert "forecast_30" in report["forecasts"]
        print("E2E Test: 6-Agent reports validated successfully!")
        
        # Check Copilot Q&A Chat
        chat_res = client.post(
            f"/copilot/{dataset_id}",
            json={"message": "Why is the quality score low?", "chat_history": []}
        )
        assert chat_res.status_code == 200
        chat_body = chat_res.json()
        print("E2E Test: Copilot responded successfully!")
        print(f"Copilot Response: {chat_body['response'][:120]}...")
        
        print("\nALL SYSTEM VERIFICATIONS COMPLETED SUCCESSFULLY!")
        
    finally:
        # Cleanup
        if os.path.exists(test_csv):
            os.remove(test_csv)
        # Delete upload file
        uploaded_file = f"./uploads/{dataset_id}.csv"
        if os.path.exists(uploaded_file):
            os.remove(uploaded_file)
            
if __name__ == "__main__":
    test_integration()
