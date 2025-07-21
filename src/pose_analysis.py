# src/pose_analysis.py
from ultralytics import YOLO
import cv2

# Load the YOLOv8 pose estimation model
# 'yolov8n-pose.pt' is a small and fast variant suitable for edge devices.
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
    # Perform prediction on the frame
    # conf: confidence threshold for detections
    # save: do not save prediction results to disk
    # verbose: suppress verbose output
    results = model.predict(source=frame, conf=0.5, save=False, verbose=False)

    # Extract keypoints from the results.
    # results[0] refers to the first (and usually only) image in the batch.
    # .keypoints.xy provides the (x, y) coordinates of the detected keypoints.
    # It's a list where each element corresponds to a detected person's keypoints.
    if results and results[0].keypoints:
        return results[0].keypoints.xy.cpu().numpy() # Convert to numpy array for easier handling
    return []