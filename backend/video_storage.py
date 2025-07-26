# backend/video_storage.py
import cv2
import os
import datetime
import sqlite3

# Define the path for the SQLite database file
DB_FILE = 'evidence.db'
# Ensure the 'storage' directory exists for video files
VIDEO_STORAGE_DIR = 'storage'
os.makedirs(VIDEO_STORAGE_DIR, exist_ok=True)

def init_db():
    """
    Initializes the SQLite database and creates the 'evidence_log' table
    if it does not already exist.
    """
    conn = None
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS evidence_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                location TEXT,
                file_path TEXT NOT NULL,
                confidence REAL,
                status TEXT DEFAULT 'new'
            )
        ''')
        conn.commit()
        print(f"SQLite database '{DB_FILE}' initialized successfully.")
    except sqlite3.Error as e:
        print(f"Error initializing database: {e}")
    finally:
        if conn:
            conn.close()

def save_clip(frames, base_filename="anomaly_clip", fps=10, location="Unknown", confidence=None, event_type="Anomaly"):
    """
    Saves a list of video frames as an MP4 file and logs its metadata to a SQLite database.

    Args:
        frames (list of numpy.ndarray): A list of OpenCV frames (BGR format) to save.
        base_filename (str): The base name for the output video file.
        fps (float): Frames per second for the output video.
        location (str): The location where the event occurred.
        confidence (float, optional): The confidence score of the detection.
        event_type (str): The specific type of anomaly detected (e.g., "Fighting", "RoadAccident").
                          This is used for database logging.

    Returns:
        str: The full path to the saved video file, or None if saving failed.
    """
    if not frames:
        print("No frames provided to save.")
        return None

    # Get dimensions from the first frame
    h, w, _ = frames[0].shape

    # Generate a unique filename with a timestamp
    timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{base_filename}_{timestamp_str}.mp4"
    filepath = os.path.join(VIDEO_STORAGE_DIR, filename)

    # Validate and set FPS
    try:
        fps = float(fps)
        if fps < 1 or fps > 120:
            print(f"[WARNING] Unusual FPS value ({fps}), defaulting to 10.")
            fps = 10
    except ValueError:
        print(f"[WARNING] Invalid FPS value ({fps}), defaulting to 10.")
        fps = 10

    # Define the video writer for mp4 format (using 'mp4v' codec for broader compatibility)
    out = cv2.VideoWriter(filepath, cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h))

    if not out.isOpened():
        print(f"Error: Could not open video writer for {filepath}. Check codecs or permissions.")
        return None

    # Write each frame to the video file
    for f in frames:
        out.write(f)

    # Release the video writer
    out.release()
    print(f"Video clip saved to: {filepath}")

    # Log evidence to SQLite database
    conn = None
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO evidence_log (event_type, timestamp, location, file_path, confidence)
            VALUES (?, ?, ?, ?, ?)
        ''', (event_type, timestamp_str, location, filepath, confidence)) # event_type is now correctly used here
        conn.commit()
        print(f"Evidence logged to database: {filename}")
    except sqlite3.Error as e:
        print(f"Error logging evidence to database: {e}")
    finally:
        if conn:
            conn.close()

    return filepath

# Initialize the database when this module is imported
init_db()
