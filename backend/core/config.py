import os
import psycopg2
from psycopg2.extras import RealDictCursor

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "5433")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Bc061192!")
DB_NAME = "partsman_db" # Dedicated database for complete isolation!

def init_database():
    """Creates the dedicated partsman_db if it does not exist."""
    try:
        # Connect to default 'postgres' database first to execute CREATE DATABASE
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database="postgres"
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        # Check if database exists
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
        exists = cur.fetchone()
        if not exists:
            print(f"[DB_MONOLITH] Initializing separated database: {DB_NAME}")
            cur.execute(f"CREATE DATABASE {DB_NAME}")
        else:
            print(f"[DB_MONOLITH] Separated database '{DB_NAME}' verified.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[DB_WARNING] Could not verify/create database '{DB_NAME}': {e}. Falling back to default.")

def get_db_connection():
    try:
        return psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
    except Exception:
        # Fallback to default postgres database if dedicated database fails
        return psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database="postgres"
        )
