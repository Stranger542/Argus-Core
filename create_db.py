# create_db.py
import psycopg2
import os
from dotenv import load_dotenv
import sys

# Load environment variables from .env file
# Ensure your .env file has DB_NAME, DB_USER, DB_PASS, DB_HOST, DB_PORT
load_dotenv()

def create_database_and_tables():
    """
    Connects to the PostgreSQL server, creates the database if it doesn't exist,
    and then creates the necessary tables ('users', 'cameras', 'incidents',
    'clips', 'alerts') for the Argus Core backend.
    """
    # --- Database Configuration from .env ---
    DB_NAME = os.getenv("DB_NAME", "argus_core_db")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASS = os.getenv("DB_PASS") # CRITICAL: Ensure DB_PASS is set in your .env
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")

    if not DB_PASS:
        print("[ERROR] Database password (DB_PASS) not found in .env file. Please set it.")
        sys.exit(1)

    conn = None
    try:
        # Step 1: Connect to the default 'postgres' database to create the target DB
        print("Connecting to default 'postgres' database...")
        conn = psycopg2.connect(
            dbname="postgres",
            user=DB_USER,
            password=DB_PASS,
            host=DB_HOST,
            port=DB_PORT
        )
        conn.autocommit = True  # Necessary for CREATE DATABASE command
        cursor = conn.cursor()

        # Check if the target database already exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
        exists = cursor.fetchone()
        if not exists:
            print(f"Database '{DB_NAME}' not found. Creating...")
            cursor.execute(f"CREATE DATABASE {DB_NAME}") # Use f-string carefully or parameterized query if needed
            print(f"Database '{DB_NAME}' created successfully.")
        else:
            print(f"Database '{DB_NAME}' already exists.")

        cursor.close()
        conn.close() # Close connection to 'postgres' db

        # Step 2: Connect to the newly created/existing Argus Core database
        print(f"Connecting to database '{DB_NAME}' to create tables...")
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            host=DB_HOST,
            port=DB_PORT
        )
        cursor = conn.cursor()

        print("Creating tables if they don't exist...")

        # --- Define Table Schemas ---

        # Users Table (for login/registration)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                is_active INTEGER DEFAULT 1,
                -- Add other user fields if needed (e.g., name, created_at)
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        ''')
        print(" -> 'users' table checked/created.")

        # Cameras Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cameras (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                rtsp_url TEXT,
                location VARCHAR(255),
                is_active INTEGER DEFAULT 1
            );
        ''')
        print(" -> 'cameras' table checked/created.")

        # Incidents Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS incidents (
                id SERIAL PRIMARY KEY,
                camera_id INTEGER NOT NULL REFERENCES cameras(id) ON DELETE SET NULL, -- Allow camera deletion
                event_type VARCHAR(255) NOT NULL, -- Increased length for multiple types
                score REAL,
                started_at TIMESTAMP WITH TIME ZONE NOT NULL,
                ended_at TIMESTAMP WITH TIME ZONE,
                status VARCHAR(20) DEFAULT 'detected',
                note TEXT -- For storing JSON list of anomaly events
            );
        ''')
        print(" -> 'incidents' table checked/created.")

        # Clips Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS clips (
                id SERIAL PRIMARY KEY,
                incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, -- Delete clips if incident is deleted
                file_path TEXT NOT NULL UNIQUE, -- File path should be unique
                uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                duration_seconds REAL
            );
        ''')
        print(" -> 'clips' table checked/created.")

        # Alerts Table (Optional: for logging alert attempts)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id SERIAL PRIMARY KEY,
                incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
                channel VARCHAR(30) DEFAULT 'email',
                status VARCHAR(20) DEFAULT 'sent', -- e.g., queued, sent, failed
                details TEXT, -- e.g., recipient email, error message
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        ''')
        print(" -> 'alerts' table checked/created.")

        # Commit all table creation statements
        conn.commit()
        print("\nAll required tables checked/created successfully.")

        # Optional: Create a default camera if none exist
        cursor.execute("SELECT COUNT(*) FROM cameras")
        if cursor.fetchone()[0] == 0:
            print("No cameras found. Creating a default camera entry...")
            cursor.execute(
                "INSERT INTO cameras (name, location, is_active) VALUES (%s, %s, %s)",
                ('Default Camera 1', 'Default Location', 1)
            )
            conn.commit()
            print(" -> Default camera created.")


    except psycopg2.OperationalError as e:
        # Specific error for connection issues
        print(f"\n[FATAL ERROR] Could not connect to PostgreSQL.")
        print("Please ensure:")
        print("  1. PostgreSQL server is running.")
        print(f"  2. Connection details in .env (HOST={DB_HOST}, PORT={DB_PORT}, USER={DB_USER}) are correct.")
        print("  3. The password (DB_PASS) in .env is correct for the PostgreSQL user.")
        print(f"Error details: {e}")
        sys.exit(1)
    except Exception as e:
        # Catch other potential errors during execution
        print(f"\n[FATAL ERROR] An unexpected error occurred: {e}")
        traceback.print_exc() # Print full traceback for debugging
        sys.exit(1)
    finally:
        # Ensure connection is always closed
        if conn:
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    # Add traceback import for detailed error reporting if needed
    import traceback
    create_database_and_tables()