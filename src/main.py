# src/main.py
import cv2
import os
import time
import random
import sys
import collections

# Ensure project root is in sys.path for backend imports
sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from action_detection import predict_fight
from pose_analysis import detect_poses  # Although not fully integrated for filtering yet, it's available
from utils import FightConfidenceQueue
from backend.alert_service import send_alert
from backend.video_storage import save_clip

# --- Configuration ---
# Base path to your RWF-2000 test dataset's Fight videos
RWF_TEST_FIGHT_DIR = "datasets/rwf_2000/test/Fight"

# Select a random fight video from the test set for simulation
def get_random_fight_video_path(base_dir):
    """
    Selects a random video file from the specified directory.
    """
    if not os.path.exists(base_dir):
        print(f"Error: Dataset path not found: {base_dir}")
        print("Please ensure you have run download_dataset.py and organized the RWF-2000 dataset.")
        return None

    video_files = [f for f in os.listdir(base_dir) if f.lower().endswith(('.avi', '.mp4', '.mov', '.mkv'))]
    if not video_files:
        print(f"Error: No video files found in {base_dir}")
        return None

    selected_video = random.choice(video_files)
    return os.path.join(base_dir, selected_video)

# Set VIDEO_SOURCE to a randomly selected fight video
VIDEO_SOURCE = get_random_fight_video_path(RWF_TEST_FIGHT_DIR)

# If VIDEO_SOURCE is None, it means there was an error finding videos.
if VIDEO_SOURCE is None:
    print("Exiting as no valid video source could be determined.")
    sys.exit(1)



# --- Evidence Clip Settings ---
# Set this to your desired evidence video length (in seconds, e.g., 5-10)
EVIDENCE_SECONDS = 5  # Change to 5, 7, etc. as needed

ALERT_THRESHOLD = 0.3 # Probability threshold for a frame to be considered a 'hit'
MIN_HITS_FOR_ALERT = 6 # Minimum number of consecutive 'hits' to trigger an alert
LOCATION = "CCTV Camera 1 / Main Entrance" # Location for alerts


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


# Number of frames for evidence buffer (e.g., 10 seconds)
# This ensures the evidence video is EVIDENCE_SECONDS long and contains all frames
EVIDENCE_FRAMES = int(EVIDENCE_SECONDS * fps)

# For ML inference, you may want to keep a smaller sliding window (e.g., 16)
FRAMES_PER_CLIP = 16
conf_queue = FightConfidenceQueue(max_len=FRAMES_PER_CLIP)

# Buffer for evidence: always keep the last EVIDENCE_FRAMES frames (for evidence video)
evidence_buffer = collections.deque(maxlen=EVIDENCE_FRAMES)
# Buffer for ML inference
frames_buffer = []
alert_triggered = False

print(f"Successfully opened video source: {VIDEO_SOURCE}")
print(f"FPS: {fps:.2f} | Evidence buffer: {EVIDENCE_FRAMES} frames ({EVIDENCE_SECONDS} sec)")
print("Starting real-time detection loop...")
while True:
    ret, frame = cap.read()
    if not ret:
        print("End of video stream. Stopping detection.")
        break

    # Add to evidence buffer (original frame for best quality)
    evidence_buffer.append(frame.copy())

    # Resize for ML model
    processed_frame = cv2.resize(frame, (224, 224))
    frames_buffer.append(processed_frame)

    # ML inference every FRAMES_PER_CLIP frames
    if len(frames_buffer) == FRAMES_PER_CLIP:
        prob_fight = predict_fight(frames_buffer)
        if prob_fight is not None:
            conf_queue.update(prob_fight)
            if conf_queue.should_alert(threshold=ALERT_THRESHOLD, min_hits=MIN_HITS_FOR_ALERT):
                if not alert_triggered:
                    print(f"\n[ALERT TRIGGERED] Fight Detected at {LOCATION}! Confidence: {prob_fight:.2f}")
                    safe_location = LOCATION.replace(' ', '_').replace('/', '_').replace('\\', '_')
                    # Save the last EVIDENCE_SECONDS seconds as evidence (with all frames)
                    evidence_path = save_clip(list(evidence_buffer), base_filename=f"fight_evidence_{safe_location}", fps=fps)
                    if evidence_path:
                        print(f"Fight evidence saved to: {evidence_path}")
                        send_alert(evidence_path, location=LOCATION)
                    else:
                        print("[ERROR] Failed to save fight evidence clip.")
                    alert_triggered = True
            else:
                if alert_triggered:
                    print(f"[ALERT CLEARED] Confidence dropped below threshold. Current prob: {prob_fight:.2f}")
                    alert_triggered = False

            # Display current status (optional, for debugging/monitoring)
            status_text = f"Prob: {prob_fight:.2f} | Alert: {'YES' if alert_triggered else 'NO'}"
            cv2.putText(frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2, cv2.LINE_AA)
        else:
            print("Warning: Model returned None for fight probability. Skipping this clip.")
        frames_buffer.clear()

    # Display the original frame (or frame with pose detections)
    cv2.imshow('Argus Core - Real-time Detection', frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        print("Exiting detection loop.")
        break

# --- Cleanup ---
cap.release()
cv2.destroyAllWindows()