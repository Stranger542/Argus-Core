# src/edge_client.py
import cv2
import os
from dotenv import load_dotenv
import time
import random
import sys
import collections
import re
import requests
import json
from datetime import datetime, timezone
import numpy as np

# Add parent directory to sys.path to import from sibling directories
# This handles both running from project root and from src/
current_dir = os.path.dirname(os.path.abspath(__file__)) if '__file__' in locals() else os.getcwd()
sys.path.append(os.path.abspath(os.path.join(current_dir, '..')))

from anomaly_detection import predict_anomaly
from anomaly_config import ANOMALY_CLASSES, ALERT_ANOMALY_CLASSES, CLASS_TO_IDX
from pose_analysis import detect_poses
from utils import AnomalyConfidenceQueue
from backend.alert_service import send_alert

# --- Configuration (remains the same) ---
UCF_CRIME_TEST_DIR = "datasets/ucf_crime/test"
RWF_TEST_DIR = "datasets/rwf_2000/test"
RWF_CLASS_MAPPING = { 'Fight': 'Fighting', 'NonFight': 'Normal_Videos' }

def get_random_anomaly_video_path(base_dirs, class_name=None):
    # This function remains unchanged...
    all_candidate_videos = []
    for base_dir in base_dirs:
        adjusted_base_dir = os.path.abspath(os.path.join(current_dir, '..', base_dir))
        if not os.path.exists(adjusted_base_dir):
            print(f"Warning: Dataset path not found: {adjusted_base_dir}. Skipping.")
            continue
        target_class_dirs_for_this_base = []
        if class_name:
            target_class_dirs_for_this_base.append(os.path.join(adjusted_base_dir, class_name))
        else:
            available_folders_in_dir = [d for d in os.listdir(adjusted_base_dir) if os.path.isdir(os.path.join(adjusted_base_dir, d))]
            for folder_name in available_folders_in_dir:
                if folder_name in ANOMALY_CLASSES:
                    target_class_dirs_for_this_base.append(os.path.join(adjusted_base_dir, folder_name))
        for current_class_dir in target_class_dirs_for_this_base:
            if not os.path.exists(current_class_dir):
                continue
            video_files = [f for f in os.listdir(current_class_dir) if f.lower().endswith(('.avi', '.mp4', '.mov', '.mkv'))]
            for video_file in video_files:
                all_candidate_videos.append(os.path.join(current_class_dir, video_file))
    if not all_candidate_videos:
        print(f"Error: No video files found for class '{class_name if class_name else 'any'}' in provided directories: {base_dirs}")
        return None
    selected_video = random.choice(all_candidate_videos)
    print(f"Randomly selected video for simulation: {selected_video}")
    return selected_video

# --- API & Authentication Configuration (remains the same) ---
BACKEND_API_URL = "http://localhost:8080"
load_dotenv()
API_KEY = os.getenv("ARGUS_API_KEY")
HEADERS = {"x-api-key": API_KEY}
VIDEO_TEMP_DIR = "temp_clips"
os.makedirs(VIDEO_TEMP_DIR, exist_ok=True)

# --- Anomaly Detection Configuration (remains the same) ---
ALERT_CONFIDENCE_THRESHOLD = 0.5
MIN_HITS_FOR_ALERT = 3 
FRAMES_PER_CLIP = 16

# --- Camera Configuration (remains the same) ---
CAMERA_SOURCES = [
    {"id": 1, "source": get_random_anomaly_video_path([UCF_CRIME_TEST_DIR], class_name=None), "location": "Test Location A"},
]

# --- Helper Functions (remain the same) ---
def save_clip(frames, base_filename, fps):
    # This function remains unchanged...
    if not frames: return None
    sanitized_filename = re.sub(r'[^a-zA-Z0-9_-]', '_', base_filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{sanitized_filename}_{timestamp}.mp4"
    filepath = os.path.join(VIDEO_TEMP_DIR, filename)
    try:
        height, width, _ = frames[0].shape
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(filepath, fourcc, fps, (width, height))
        for frame in frames:
            out.write(frame)
        out.release()
        return filepath
    except Exception as e:
        print(f"[ERROR] Failed to save clip {filepath}: {e}")
        return None

def send_alert_to_backend(camera_id: int, anomaly_type: str, score: float, started_at: datetime, ended_at: datetime):
    # This function remains unchanged...
    try:
        payload = { "camera_id": camera_id, "event_type": anomaly_type, "score": score, "started_at": started_at.isoformat(), "ended_at": ended_at.isoformat() if ended_at else started_at.isoformat() }
        response = requests.post(f"{BACKEND_API_URL}/events", json=payload, headers=HEADERS, timeout=10)
        response.raise_for_status()
        print(f"✅ Consolidated incident created. Response: {response.json()}")
        return response.json()['id']
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Failed to send consolidated incident to backend API: {e}")
        return None

def upload_clip_to_backend(incident_id: int, file_path: str):
    # This function remains unchanged...
    if not file_path or not os.path.exists(file_path):
        print(f"[ERROR] Clip file not found for upload: {file_path}")
        return
    try:
        with open(file_path, "rb") as f:
            files = {'file': (os.path.basename(file_path), f, 'video/mp4')}
            data = {'incident_id': incident_id}
            response = requests.post(f"{BACKEND_API_URL}/clips/upload", data=data, files=files, headers=HEADERS, timeout=60)
            response.raise_for_status()
        print(f"✅ Full video uploaded successfully for incident {incident_id}. Response: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Failed to upload clip for incident {incident_id}: {e}")
    finally:
        pass

def process_video_file(cam_info):
    camera_id = cam_info["id"]
    video_source = cam_info["source"]
    camera_location = cam_info["location"]
    
    cap = cv2.VideoCapture(video_source)
    if not cap.isOpened():
        print(f"Error: Could not open video source for {camera_id}: {video_source}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    
    full_video_frames_buffer = [] 
    frames_buffer_for_ml = []
    
    detected_anomalies = []
    anomaly_conf_queues = {
        anomaly_type: AnomalyConfidenceQueue(max_len=FRAMES_PER_CLIP)
        for anomaly_type in ALERT_ANOMALY_CLASSES
    }
    alert_triggered_status = {anomaly_type: False for anomaly_type in ALERT_ANOMALY_CLASSES}

    print(f"Starting simulation for Camera {camera_id} at {video_source}...")
    print(f"FPS: {fps:.2f} | Monitoring for: {', '.join(ALERT_ANOMALY_CLASSES)}")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("End of video stream.")
            break
        
        full_video_frames_buffer.append(frame.copy())
        
        processed_frame = cv2.resize(frame, (224, 224))
        frames_buffer_for_ml.append(processed_frame)

        if len(frames_buffer_for_ml) == FRAMES_PER_CLIP:
            predicted_class_name, prob_anomaly = predict_anomaly(frames_buffer_for_ml)
            
            if prob_anomaly is not None:
                if predicted_class_name in anomaly_conf_queues:
                    anomaly_conf_queues[predicted_class_name].update(prob_anomaly)
                else:
                    for q in anomaly_conf_queues.values():
                        q.clear()

                for anomaly_type in ALERT_ANOMALY_CLASSES:
                    current_queue = anomaly_conf_queues[anomaly_type]
                    
                    if current_queue.should_alert(threshold=ALERT_CONFIDENCE_THRESHOLD, min_hits=MIN_HITS_FOR_ALERT):
                        if not alert_triggered_status[anomaly_type]:
                            print(f"\n[ALERT DETECTED IN STREAM] {anomaly_type} Confidence: {prob_anomaly:.2f}")
                            alert_triggered_status[anomaly_type] = True
                            detected_anomalies.append({
                                "anomaly_type": anomaly_type,
                                "score": prob_anomaly, 
                                "timestamp": datetime.now(timezone.utc)
                            })
                    else:
                        if alert_triggered_status[anomaly_type]:
                            print(f"[ALERT CLEARED IN STREAM] {anomaly_type} confidence dropped. Current prob: {prob_anomaly:.2f}")
                            alert_triggered_status[anomaly_type] = False

                # --- NEW: Add status text to the frame for display ---
                status_text = f"Detected: {predicted_class_name} (P: {prob_anomaly:.2f})"
                for anomaly_type, triggered in alert_triggered_status.items():
                    if triggered:
                        status_text += f" | ACTIVE: {anomaly_type}"
                cv2.putText(frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2, cv2.LINE_AA)

            frames_buffer_for_ml.clear()

        # --- NEW: Display the video frame in a window ---
        cv2.imshow('Argus Core - Edge Client', frame)

        # --- NEW: Check for 'q' key to quit ---
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("Exiting detection loop.")
            break

    print(f"\nVideo processing finished for Camera {camera_id}.")

    # --- Post-processing (remains the same) ---
    if not detected_anomalies:
        print("--- No alert-worthy anomalies detected in this video stream. ---")
    else:
        print("--- Consolidating detected anomalies and sending a single alert... ---")
        summary_types = ", ".join(sorted(set([a["anomaly_type"] for a in detected_anomalies])))
        max_score = max([a["score"] for a in detected_anomalies])
        start_time = min([a["timestamp"] for a in detected_anomalies])
        end_time = max([a["timestamp"] for a in detected_anomalies])
        
        incident_id = send_alert_to_backend(
            camera_id=camera_id, anomaly_type=summary_types, score=max_score,
            started_at=start_time, ended_at=end_time
        )
        
        if incident_id:
            print("Saving full video as evidence...")
            full_clip_path = save_clip(
                full_video_frames_buffer,
                base_filename=f"consolidated_evidence_{camera_id}_{incident_id}",
                fps=fps
            )
            if full_clip_path:
                print(f"Full video saved to {full_clip_path}. Uploading now...")
                upload_clip_to_backend(incident_id, full_clip_path)
                
                print("Proceeding to send email alert...")
                send_alert(
                    video_file_path=full_clip_path,
                    location=camera_location,
                    anomaly_type=summary_types
                )

                if os.path.exists(full_clip_path):
                    os.remove(full_clip_path)
            else:
                print("[ERROR] Failed to save the full evidence clip.")

    # --- Cleanup ---
    cap.release()
    # --- NEW: Destroy the OpenCV window ---
    cv2.destroyAllWindows()
    print(f"--- Processing for camera {camera_id} stopped. ---")

if __name__ == '__main__':
    for cam in CAMERA_SOURCES:
        if cam["source"]:
            process_video_file(cam)
        else:
            print(f"Skipping camera {cam['id']} due to missing video source.")