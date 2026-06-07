import sqlite3
import json
from datetime import datetime
from app.core.config import settings

DB_PATH = settings.DATABASE_URL.replace("sqlite:///", "")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create datasets table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        upload_time TEXT NOT NULL,
        status TEXT NOT NULL,
        file_path TEXT NOT NULL,
        row_count INTEGER,
        column_count INTEGER,
        metrics TEXT
    )
    """)
    
    # Create analysis_reports table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS analysis_reports (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        profiling_data TEXT,
        duplicate_groups TEXT,
        insights TEXT,
        root_causes TEXT,
        recommendations TEXT,
        forecasts TEXT,
        dashboard_config TEXT,
        storytelling_narrative TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id)
    )
    """)

    # Dynamic schema upgrades for existing DB instances
    try:
        cursor.execute("ALTER TABLE analysis_reports ADD COLUMN dashboard_config TEXT")
    except sqlite3.OperationalError:
        pass # already exists

    try:
        cursor.execute("ALTER TABLE analysis_reports ADD COLUMN storytelling_narrative TEXT")
    except sqlite3.OperationalError:
        pass # already exists
    
    # Create copilot_sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS copilot_sessions (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        chat_history TEXT NOT NULL,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id)
    )
    """)
    
    conn.commit()
    conn.close()
