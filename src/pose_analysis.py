# src/pose_analysis.py
from ultralytics import YOLO
import cv2
model = YOLO("yolov8n-pose.pt")

def detect_poses(frame):
    """
    Detects human poses in a given video frame using YOLOv8-Pose.
    Args:
        frame (numpy.ndarray): The input video frame (BGR format).
    Returns:
        list: A list of detected poses. Each pose is represented by a list of [x, y] keypoints.
              Returns an empty list if no poses are detected.
    """
    results = model.predict(source=frame, conf=0.5, save=False, verbose=False)
    if results and results[0].keypoints:
        return results[0].keypoints.xy.cpu().numpy() # Convert to numpy array for easier handling
    return []