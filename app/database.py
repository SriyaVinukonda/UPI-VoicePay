"""
Database configuration for UPI VoicePay backend simulation.

Uses SQLite so the whole project runs with zero external setup —
perfect for a college major-project demo. Swap SQLALCHEMY_DATABASE_URL
for a Postgres/MySQL URL later if you want to "productionize" it.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "voicepay.db")
)
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

print(f"[Database] SQLite DB Absolute Path: {DB_PATH}")

# check_same_thread=False is needed only for SQLite when used with FastAPI's
# multiple worker threads.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db_migrations():
    try:
        with engine.connect() as conn:
            result = conn.exec_driver_sql("PRAGMA table_info(transactions)")
            columns = [row[1] for row in result.fetchall()]
            if columns and "verification_method" not in columns:
                conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN verification_method VARCHAR")
                conn.commit()
    except Exception as e:
        print(f"[Database Migration Warning] {e}")


init_db_migrations()



def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
