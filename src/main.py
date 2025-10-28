# src/main.py
import cv2
import os
import time
import random
import sys
import collections
import re # Import regex module

# Ensure project root is in sys.path for backend imports
sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

# Import the new anomaly detection module and config
from .anomaly_detection import predict_anomaly
from .anomaly_config import ANOMALY_CLASSES, ALERT_ANOMALY_CLASSES, CLASS_TO_IDX
from .pose_analysis import detect_poses
from .utils import AnomalyConfidenceQueue
from backend.alert_service import send_alert
from backend.video_storage import save_clip

# --- Configuration ---
# Base paths to your datasets' test splits
UCF_CRIME_TEST_DIR = "datasets/ucf_crime/test"
RWF_TEST_DIR = "datasets/rwf_2000/test" # RWF is NOT used in VIDEO_SOURCE selection for simulation

# Define mapping for RWF-2000 folder names to standardized ANOMALY_CLASSES
RWF_CLASS_MAPPING = {
    'Fight': 'Fighting',
    'NonFight': 'Normal_Videos'
}

def get_random_anomaly_video_path(base_dirs, class_name=None, class_mapping=None):
    """
    Selects a random video file from specified base directories for a given class.
    If class_name is None, picks a random class and then a random video from any available dataset.
    
    Args:
        base_dirs (list): A list of root directories to search for test videos (e.g., [UCF_CRIME_TEST_DIR]).
        class_name (str, optional): The specific class name to select a video from (e.g., "Fighting", "RoadAccident").
                                    If None, a random class is chosen from all available classes across base_dirs.
        class_mapping (dict, optional): A dictionary to map actual folder names to standardized ANOMALY_CLASSES.
                                        Used for datasets like RWF or RLVS if they were included.
    Returns:
        str: The full path to the selected video, or None if no valid video source could be found.
    """
    all_candidate_videos = []
    
    for base_dir in base_dirs:
        # Adjust path relative to the script's location (src/)
        adjusted_base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', base_dir))

        if not os.path.exists(adjusted_base_dir):
            print(f"Warning: Dataset path not found: {adjusted_base_dir}. Skipping this directory.")
            continue
        
        target_class_dirs_for_this_base = []
        if class_name:
            # Try to find the folder name that maps to the requested class_name
            # For UCF_CRIME_TEST_DIR, assume folder names directly match ANOMALY_CLASSES
            actual_folder_name = class_name 
            target_class_dirs_for_this_base.append(os.path.join(adjusted_base_dir, actual_folder_name))
        else: # If no specific class is requested, find all available classes in this base_dir
            available_folders_in_dir = [d for d in os.listdir(adjusted_base_dir) if os.path.isdir(os.path.join(adjusted_base_dir, d))]
            for folder_name in available_folders_in_dir:
                # For UCF_CRIME_TEST_DIR, assume folder names directly match ANOMALY_CLASSES
                standardized_name = folder_name
                if standardized_name in ANOMALY_CLASSES: # Only include if it's a class we care about (defined in anomaly_config)
                    target_class_dirs_for_this_base.append(os.path.join(adjusted_base_dir, folder_name))

        for current_class_dir in target_class_dirs_for_this_base:
            if not os.path.exists(current_class_dir):
                print(f"Warning: Class directory not found: {current_class_dir}. Skipping.")
                continue
            
            video_files = [f for f in os.listdir(current_class_dir) if f.lower().endswith(('.avi', '.mp4', '.mov', '.mkv'))]
            for video_file in video_files:
                all_candidate_videos.append(os.path.join(current_class_dir, video_file))

    if not all_candidate_videos:
        print(f"Error: No video files found for class '{class_name if class_name else 'any'}' in any of the provided base directories: {base_dirs}")
        return None
    
    selected_video = random.choice(all_candidate_videos)
    print(f"Randomly selected video for simulation: {selected_video}")
    return selected_video

# Set VIDEO_SOURCE to pick a random video from the UCF_CRIME_TEST_DIR
# You can specify a class here for specific testing, e.g., class_name="RoadAccident"
# If class_name is None, it will pick a random video from ANY class across BOTH datasets.
VIDEO_SOURCE = get_random_anomaly_video_path([UCF_CRIME_TEST_DIR], class_name=None)

# If VIDEO_SOURCE is None, it means there was an error finding videos.
if VIDEO_SOURCE is None:
    print("Exiting as no valid video source could be determined.")
    sys.exit(1)


# --- Detection Thresholds and Alert Settings ---
ALERT_CONFIDENCE_THRESHOLD = 0.5 # Minimum probability for an anomaly to be considered for alert
MIN_HITS_FOR_ALERT = 3 # Minimum number of consecutive 'hits' to trigger an alert for any anomaly
LOCATION = "CCTV Camera 1 / Main Entrance" # Location for alerts
EVIDENCE_SECONDS = 20  # Increased from 10 to 20 seconds for even longer video clips


# --- Main execution block ---
if __name__ == '__main__': # Ensure all main execution logic is within this block

    # --- Initialization ---
    cap = cv2.VideoCapture(VIDEO_SOURCE)
    if not cap.isOpened():
        print(f"Error: Could not open video source {VIDEO_SOURCE}")
        print("Please ensure the video file exists and is not corrupted.")
        sys.exit(1)

    # Get FPS for evidence buffer sizing
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps < 1:
        print("Warning: Could not determine FPS, defaulting to 25.")
        fps = 25

    # A buffer to store ALL frames of the current video stream for potential full video saving
    full_video_frames_buffer = [] 

    EVIDENCE_FRAMES_ROLLING_BUFFER = int(EVIDENCE_SECONDS * fps) # Max length of the rolling buffer for display
    FRAMES_PER_CLIP = 16 # Number of frames for ML inference input

    # Use a dictionary of confidence queues, one for each alert-worthy anomaly type
    anomaly_conf_queues = {
        anomaly_type: AnomalyConfidenceQueue(max_len=FRAMES_PER_CLIP)
        for anomaly_type in ALERT_ANOMALY_CLASSES
    }

    # Buffer for evidence: always keep the last EVIDENCE_FRAMES_ROLLING_BUFFER original frames (for display)
    evidence_buffer = collections.deque(maxlen=EVIDENCE_FRAMES_ROLLING_BUFFER)
    # Buffer for ML inference (resized frames)
    frames_buffer = []

    # These flags and sets must be initialized within the main execution block
    any_anomaly_detected_during_video = False
    unique_anomalies_detected = set() 
    alert_triggered_status = {anomaly_type: False for anomaly_type in ALERT_ANOMALY_CLASSES}


    print(f"Successfully opened video source: {VIDEO_SOURCE}")
    print(f"FPS: {fps:.2f} | Rolling evidence buffer: {EVIDENCE_FRAMES_ROLLING_BUFFER} frames ({EVIDENCE_SECONDS} sec)")
    print("Starting real-time detection loop...")

    # Get total frames of the video to ensure we stop correctly
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    current_frame_count = 0

    while True:
        ret, frame = cap.read()
        current_frame_count += 1

        # If ret is False, or if we've processed all frames, break the loop
        if not ret or current_frame_count > total_frames:
            print("End of video stream. Stopping detection.")
            break

        evidence_buffer.append(frame.copy())
        full_video_frames_buffer.append(frame.copy()) # Ensure full video buffer is populated

        processed_frame = cv2.resize(frame, (224, 224))
        frames_buffer.append(processed_frame)

        if len(frames_buffer) == FRAMES_PER_CLIP:
            predicted_class_name, prob_anomaly = predict_anomaly(frames_buffer)
            
            if predicted_class_name is not None and prob_anomaly is not None:
                # Update confidence queue for the predicted anomaly type if it's an alert-worthy class
                if predicted_class_name in anomaly_conf_queues:
                    anomaly_conf_queues[predicted_class_name].update(prob_anomaly)
                else:
                    # If a non-alert-worthy class (e.g., "Normal_Videos") is predicted, clear all queues
                    # This prevents stale high confidence from non-anomalies
                    for q in anomaly_conf_queues.values():
                        q.clear()

                # Check for alerts across all alert-worthy anomaly types
                for anomaly_type in ALERT_ANOMALY_CLASSES:
                    current_queue = anomaly_conf_queues[anomaly_type]
                    
                    # If this anomaly type is currently being detected with high confidence
                    if current_queue.should_alert(threshold=ALERT_CONFIDENCE_THRESHOLD, min_hits=MIN_HITS_FOR_ALERT):
                        if not alert_triggered_status[anomaly_type]: # Trigger alert message only once per continuous event
                            print(f"\n[ALERT DETECTED IN STREAM] {anomaly_type} Confidence: {prob_anomaly:.2f}")
                            any_anomaly_detected_during_video = True # Mark that an anomaly was detected in this video
                            unique_anomalies_detected.add(anomaly_type) # Add to the set of detected anomalies
                            alert_triggered_status[anomaly_type] = True # Set flag to prevent re-triggering for the same event
                    else:
                        # If confidence for this anomaly type drops, clear its alert status
                        if alert_triggered_status[anomaly_type]:
                            print(f"[ALERT CLEARED IN STREAM] {anomaly_type} confidence dropped. Current prob: {prob_anomaly:.2f}")
                            alert_triggered_status[anomaly_type] = False # Reset alert flag for this anomaly type

                # Display current status on the video frame
                status_text = f"Detected: {predicted_class_name} (P: {prob_anomaly:.2f})"
                for anomaly_type, triggered in alert_triggered_status.items():
                    if triggered:
                        status_text += f" | ACTIVE: {anomaly_type}" # Changed from ALERT: to ACTIVE: for in-stream display
                cv2.putText(frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2, cv2.LINE_AA)
            else:
                print("Warning: Model returned None for anomaly prediction. Skipping this clip.")
            
            frames_buffer.clear() # Clear the ML inference buffer

        cv2.imshow('Argus Core - Real-time Anomaly Detection', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("Exiting detection loop.")
            break

    # --- End of Video Processing ---
    print("\nVideo stream ended.")

    # --- Consolidated Alert & Evidence Sending ---
    if any_anomaly_detected_during_video:
        print("\n--- Consolidated Alert Triggered ---")
        detected_anomalies_list = sorted(list(unique_anomalies_detected)) # Sort for consistent output
        # Sanitize the summary_anomaly_type for filename: replace problematic characters
        summary_anomaly_type = ", ".join(detected_anomalies_list) if detected_anomalies_list else "Anomaly"
        # Use regex to replace any character that is not alphanumeric, underscore, or hyphen with an underscore
        sanitized_summary_anomaly_type = re.sub(r'[^a-zA-Z0-9_-]', '_', summary_anomaly_type)


        print(f"Overall: Anomaly(s) '{summary_anomaly_type}' detected in video: {os.path.basename(VIDEO_SOURCE)}")
        
        # Save the ENTIRE video as evidence
        # Use the full_video_frames_buffer which contains all frames from the video
        saved_clip_path = save_clip(list(full_video_frames_buffer),
                                    base_filename=f"consolidated_evidence_{sanitized_summary_anomaly_type.lower()}_{LOCATION.replace(' ', '_').replace('/', '_').replace('\\', '_')}",
                                    fps=fps,
                                    location=LOCATION,
                                    confidence=1.0, # Assign 1.0 confidence for consolidated alert
                                    event_type=summary_anomaly_type) # Pass the summary of detected anomalies

        if saved_clip_path:
            print(f"Consolidated evidence video saved to: {saved_clip_path}")
            # Send one consolidated email alert
            send_alert(saved_clip_path, location=LOCATION, anomaly_type=summary_anomaly_type)
        else:
            print("[ERROR] Failed to save consolidated evidence clip.")
    else:
        print("No alert-worthy anomalies detected in this video stream.")

    # --- Cleanup ---
    cap.release() # Release the video capture object
    cv2.destroyAllWindows() # Close all OpenCV windows
    print("Application stopped.")
