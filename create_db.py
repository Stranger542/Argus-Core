# create_db.py
import psycopg2
import os
from dotenv import load_dotenv
import sys

# Load environment variables from .env file
load_dotenv()

def create_database_and_tables():
    """
    Connects to the PostgreSQL server, creates the database if it doesn't exist,
    and then creates the necessary tables for the Argus Core backend.
    """
    # --- Database Configuration ---
    # We first connect to the default 'postgres' database to create our new one
    DB_NAME = os.getenv("DB_NAME", "argus_core_db")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASS = os.getenv("DB_PASS", "password")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    
    conn = None
    try:
        # Step 1: Connect to the default 'postgres' database
        conn = psycopg2.connect(
            dbname="postgres",
            user=DB_USER,
            password=DB_PASS,
            host=DB_HOST,
            port=DB_PORT
        )
        conn.autocommit = True  # Set to autocommit to run CREATE DATABASE
        cursor = conn.cursor()

        # Check if the database already exists
        try:
            cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{DB_NAME}'")
            exists = cursor.fetchone()
            if not exists:
                print(f"Database '{DB_NAME}' not found. Creating...")
                cursor.execute(f"CREATE DATABASE {DB_NAME}")
                print(f"Database '{DB_NAME}' created successfully.")
            else:
                print(f"Database '{DB_NAME}' already exists.")
        except Exception as e:
            print(f"Error checking/creating database: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

        # Step 2: Connect to the newly created/existing database and create tables
        print(f"Connecting to database '{DB_NAME}' to create tables...")
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            host=DB_HOST,
            port=DB_PORT
        )
        cursor = conn.cursor()

        print("Creating tables...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cameras (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                rtsp_url TEXT,
                location VARCHAR(255),
                is_active INTEGER DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS incidents (
                id SERIAL PRIMARY KEY,
                camera_id INTEGER NOT NULL REFERENCES cameras(id),
                event_type VARCHAR(50) NOT NULL,
                score REAL,
                started_at TIMESTAMP WITH TIME ZONE NOT NULL,
                ended_at TIMESTAMP WITH TIME ZONE,
                status VARCHAR(20) DEFAULT 'detected',
                note TEXT
            );
            CREATE TABLE IF NOT EXISTS clips (
                id SERIAL PRIMARY KEY,
                incident_id INTEGER NOT NULL REFERENCES incidents(id),
                file_path TEXT NOT NULL,
                uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                duration_seconds REAL
            );
            CREATE TABLE IF NOT EXISTS alerts (
                id SERIAL PRIMARY KEY,
                incident_id INTEGER NOT NULL REFERENCES incidents(id),
                channel VARCHAR(30) DEFAULT 'email',
                status VARCHAR(20) DEFAULT 'queued',
                details TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        ''')
        conn.commit()
        print("All tables created successfully.")
        
    except psycopg2.OperationalError as e:
        print(f"Operational Error: Could not connect to PostgreSQL. Please ensure the server is running and your connection details in .env are correct.")
        print(e)
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    create_database_and_tables()
