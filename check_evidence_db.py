# check_evidence_db.py
import sqlite3
import os
import datetime # Import datetime module for formatting

# Define the path to your SQLite database file
DB_FILE = 'evidence.db'

def check_database_entries():
    """
    Connects to the SQLite database and prints all entries
    from the 'evidence_log' table, with formatted timestamps.
    """
    if not os.path.exists(DB_FILE):
        print(f"Error: Database file '{DB_FILE}' not found.")
        print("Please ensure you have run src/main.py at least once to create the database and log entries.")
        return

    conn = None
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()

        # Query all rows from the evidence_log table
        cursor.execute("SELECT id, event_type, timestamp, location, file_path, confidence, status FROM evidence_log ORDER BY timestamp DESC")
        rows = cursor.fetchall()

        if not rows:
            print("No entries found in the 'evidence_log' table.")
            return

        print(f"\n--- Entries in '{DB_FILE}' (evidence_log table) ---")
        # Adjust header spacing for the new timestamp format
        print(f"{'ID':<4} | {'Event Type':<12} | {'Timestamp (YYYY-MM-DD HH:MM:SS)':<28} | {'Location':<25} | {'File Path':<40} | {'Confidence':<10} | {'Status':<8}")
        print("-" * 160) # Adjust width based on column headers

        for row in rows:
            # Format output for readability
            row_id, event_type, timestamp_str, location, file_path, confidence, status = row
            
            # Attempt to parse and reformat the timestamp string
            formatted_timestamp = timestamp_str
            try:
                # Assuming timestamp is stored as YYYYMMDD_HHMMSS
                dt_object = datetime.datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
                formatted_timestamp = dt_object.strftime("%Y-%m-%d %H:%M:%S")
            except ValueError:
                # If parsing fails, use the original string
                print(f"[WARNING] Could not parse timestamp '{timestamp_str}'. Displaying as is.")

            print(f"{row_id:<4} | {event_type:<12} | {formatted_timestamp:<28} | {location:<25} | {file_path:<40} | {confidence:<10.2f} | {status:<8}")

        print("\n--- End of Entries ---")

    except sqlite3.Error as e:
        print(f"Error accessing database: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_database_entries()
