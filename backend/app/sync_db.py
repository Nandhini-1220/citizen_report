# backend/sync_db.py
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # 1. Drop existing caller_subscribers table so it rebuilds cleanly
    conn.execute(text("DROP TABLE IF EXISTS caller_subscribers;"))
    
    # 2. Re-create the table with the exact columns
    conn.execute(text("""
        CREATE TABLE caller_subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complaint_id INTEGER,
            phone_number VARCHAR,
            registered_at DATETIME,
            FOREIGN KEY (complaint_id) REFERENCES complaints(id)
        );
    """))
    conn.commit()
    print("✓ Successfully synchronized caller_subscribers table with 'phone_number' column!")