import os
import sys
import pandas as pd

# Add current path to sys.path so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import init_db, get_db_connection
from app.services.pipeline_manager import PipelineManager

def create_mock_csv():
    data = {
        "id": [1, 2, 3, 4, 5, 6, 7],
        "name": ["Alice Smith", "Bob Jones", "Alice Smith", "Charlie Brown", "David Miller", "Bob Joens", "Frank Castle"],
        "email": ["alice@example.com", "bob@example.com", "alice@example.com", "", "david@example", "bob@example.com", "frank@castle.com"],
        "phone": ["123-456-7890", "+1 (555) 019-2834", "123-456-7890", "999-999-9999", "12345", "555-019-2834", "not-a-number"],
        "region": ["West", "East", "West", "North", "South", "East", "North"]
    }
    df = pd.DataFrame(data)
    # Inject some NaN values to test completeness
    df.loc[3, "email"] = None
    
    file_path = "mock_customers.csv"
    df.to_csv(file_path, index=False)
    print(f"Mock CSV created at: {file_path}")
    return file_path

def main():
    print("Initializing Database...")
    init_db()
    
    # Create test CSV
    csv_file = create_mock_csv()
    
    # Register dataset in DB
    dataset_id = "test-dataset-123"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO datasets (id, filename, upload_time, status, file_path, row_count, column_count, metrics)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        dataset_id,
        "mock_customers.csv",
        "2026-06-06T20:00:00",
        "processing",
        csv_file,
        0, 0, None
    ))
    conn.commit()
    conn.close()
    
    # Run the pipeline
    print("Running 6-Agent Quality Pipeline...")
    manager = PipelineManager()
    result = manager.run_pipeline(dataset_id, csv_file)
    print("Pipeline run completed!")
    print("Resulting metrics summary:")
    print(result)
    
    # Verify report is written
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM analysis_reports WHERE dataset_id = ?", (dataset_id,))
    report = cursor.fetchone()
    conn.close()
    
    if report:
        print("\nSUCCESS: Analysis report written to database!")
        print(f"Created at: {report['created_at']}")
        print(f"Insights generated: {len(report['insights'])}")
    else:
        print("\nFAILURE: Analysis report was not written!")
        
    # Cleanup test file
    if os.path.exists(csv_file):
        os.remove(csv_file)
        print("Cleaned up mock CSV file.")

if __name__ == "__main__":
    main()
