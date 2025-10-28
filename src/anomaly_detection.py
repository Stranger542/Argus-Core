# src/anomaly_detection.py
import torch
import torchvision.transforms as T
from torchvision.models.video import r3d_18
from PIL import Image
import cv2
import os
import sys

# Add parent directory to sys.path to import anomaly_config and model
from .anomaly_config import NUM_CLASSES, IDX_TO_CLASS # Import NUM_CLASSES and IDX_TO_CLASS
from model import get_model # Import get_model

# Determine the device to run the model on (GPU if available, otherwise CPU)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Initialize the multi-class R3D-18 model.
model = get_model(num_classes=NUM_CLASSES)

# Path to the trained multi-class model weights
MODEL_PATH = 'models/anomaly_classifier.pth' # New model name for multi-class

# Adjust path for anomaly_detection.py which is in src/
absolute_model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', MODEL_PATH))

# Check if the model file exists before attempting to load
if not os.path.exists(absolute_model_path):
    print(f"Error: '{absolute_model_path}' not found. Please ensure you have trained the multi-class model using train.py and placed the .pth file there.")
    raise FileNotFoundError(f"Model file not found: {absolute_model_path}")

try:
    # Load the state dictionary of your trained model.
    model.load_state_dict(torch.load(absolute_model_path, map_location=device))
except Exception as e:
    print(f"Error loading model state dictionary from {absolute_model_path}: {e}")
    print("This might happen if the .pth file is empty, corrupted, or not a valid PyTorch model state dict.")
    print("Please ensure train.py ran successfully and created a valid model file.")
    raise # Re-raise the exception to stop execution

# Set the model to evaluation mode
model = model.eval().to(device)

# Define the transformation pipeline for input frames.
transform = T.Compose([
    T.Resize((112, 112)),
    T.ToTensor(),
    T.Normalize(mean=[0.43216, 0.394666, 0.37645], std=[0.22803, 0.22145, 0.216989])
])

def preprocess_frames(frames):
    """
    Preprocesses a list of video frames into a single PyTorch tensor suitable for the model.

    Args:
        frames (list of numpy.ndarray): A list of OpenCV frames (BGR format).

    Returns:
        torch.Tensor: A preprocessed tensor of shape [1, C, T, H, W] on the specified device.
    """
    frames_rgb_pil = [Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB)) for f in frames]
    transformed_frames = [transform(f) for f in frames_rgb_pil]
    clip = torch.stack(transformed_frames).permute(1, 0, 2, 3).unsqueeze(0).to(device)
    return clip

def predict_anomaly(frames):
    """
    Predicts the most likely anomaly class and its probability given a sequence of video frames.

    Args:
        frames (list of numpy.ndarray): A list of OpenCV frames (BGR format) representing a video clip.

    Returns:
        tuple: (predicted_class_name: str, probability: float) or (None, None) if inference fails.
    """
    try:
        with torch.no_grad():
            clip = preprocess_frames(frames)
            out = model(clip)
            probs = torch.softmax(out, dim=1)
            
            # Get the class with the highest probability
            max_prob, predicted_idx = torch.max(probs, dim=1)
            
            predicted_class_name = IDX_TO_CLASS[predicted_idx.item()]
            probability = max_prob.item()

            # print(f"[DEBUG] Predicted: {predicted_class_name}, Probability: {probability:.2f}") # Uncomment for debug
            return predicted_class_name, probability
    except Exception as e:
        print(f"[ERROR] Exception in predict_anomaly: {e}")
        return None, None
