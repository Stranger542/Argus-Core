# src/utils.py
import cv2
import os
import torch
from torchvision import transforms
from torch.utils.data import Dataset
from PIL import Image
from collections import deque
import sys

# Add parent directory to sys.path to import anomaly_config
from .anomaly_config import ANOMALY_CLASSES, CLASS_TO_IDX

class AnomalyDataset(Dataset):
    """
    Custom Dataset for loading video clips for multi-class anomaly detection.
    Can handle different dataset structures by providing a class_folder_mapping.
    """
    def __init__(self, root_dir, transform=None, frames_per_clip=16, class_folder_mapping=None):
        """
        Args:
            root_dir (str): The root directory of the dataset (e.g., "datasets/ucf_crime/train").
            transform (callable, optional): Optional transform to be applied on a frame.
            frames_per_clip (int): Number of frames to extract for each video clip.
            class_folder_mapping (dict, optional): A dictionary to map actual folder names
                                                   in root_dir to the standardized ANOMALY_CLASSES.
                                                   Example: {'Fight': 'Fighting', 'NonFight': 'Normal_Videos'}
                                                   If None, assumes folder names directly match ANOMALY_CLASSES.
        """
        self.root_dir = root_dir
        self.transform = transform
        self.frames_per_clip = frames_per_clip
        self.samples = []

        # Determine which folders to look for based on class_folder_mapping or ANOMALY_CLASSES
        # If mapping is provided, iterate through the keys of the mapping (actual folder names)
        # If not, iterate through ANOMALY_CLASSES (assuming folder names match)
        folders_to_check = class_folder_mapping.keys() if class_folder_mapping else ANOMALY_CLASSES

        # Iterate through each defined anomaly class to find videos
        for folder_name in folders_to_check:
            folder_path = os.path.join(root_dir, folder_name)
            
            # Get the standardized class name for this folder
            # If mapping is provided, use it; otherwise, folder_name is the class_name
            standardized_class_name = class_folder_mapping[folder_name] if class_folder_mapping else folder_name

            # Ensure the standardized class name exists in our global ANOMALY_CLASSES
            if standardized_class_name not in CLASS_TO_IDX:
                print(f"Warning: Standardized class '{standardized_class_name}' from folder '{folder_name}' is not in ANOMALY_CLASSES. Skipping.")
                continue

            if not os.path.exists(folder_path):
                print(f"Warning: Dataset subfolder not found: {folder_path}. Skipping folder {folder_name}.")
                continue
            
            # Get the integer label for the current standardized class
            label = CLASS_TO_IDX[standardized_class_name]

            for video in os.listdir(folder_path):
                path = os.path.join(folder_path, video)
                if os.path.isfile(path) and video.lower().endswith(('.avi', '.mp4', '.mov', '.mkv')):
                    self.samples.append((path, label))
        
        if not self.samples:
            raise ValueError(f"No video samples found in {root_dir} for any of the defined classes. Please check dataset path and organization.")

    def __len__(self):
        return len(self.samples)

    def read_frames(self, video_path):
        """
        Reads frames from a video file and returns a tensor of shape [T, C, H, W].
        Pads with the last frame if the video is too short.
        """
        cap = cv2.VideoCapture(video_path)
        frames = []
        while len(frames) < self.frames_per_clip:
            ret, frame = cap.read()
            if not ret:
                # If video ends before collecting enough frames, pad with the last frame
                if len(frames) > 0:
                    while len(frames) < self.frames_per_clip:
                        frames.append(frames[-1])
                else:
                    cap.release()
                    raise RuntimeError(f"Could not read any frames from {video_path}")
                break
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame = Image.fromarray(frame)
            if self.transform:
                frame = self.transform(frame)
            frames.append(frame)
        cap.release()

        # Pad if not enough frames were read from a short video
        while len(frames) < self.frames_per_clip:
            frames.append(frames[-1])

        return torch.stack(frames)  # [T, C, H, W]

    def __getitem__(self, idx):
        if idx < 0 or idx >= len(self.samples):
            raise IndexError("Index out of range in AnomalyDataset")
        video_path, label = self.samples[idx]
        frames = self.read_frames(video_path)
        frames = frames.permute(1, 0, 2, 3)  # [C, T, H, W] for video models
        return frames, label


class AnomalyConfidenceQueue:
    """
    Manages a queue of anomaly probabilities to determine if a sustained alert is needed.
    Can be adapted for multi-class by tracking confidence for a specific anomaly type.
    """
    def __init__(self, max_len=10):
        self.q = deque(maxlen=max_len)

    def update(self, prob):
        self.q.append(prob)

    def should_alert(self, threshold=0.8, min_hits=6):
        """
        Checks if an alert should be triggered based on sustained high confidence.
        """
        return sum(p > threshold for p in self.q) >= min_hits

    def clear(self):
        """Clears the queue."""
        self.q.clear()

    def as_list(self):
        """Returns the queue as a list."""
        return list(self.q)

    def average(self):
        """Returns the average probability in the queue, or 0 if empty."""
        return sum(self.q) / len(self.q) if self.q else 0.0

    def __len__(self):
        """Returns the current length of the queue."""
        return len(self.q)
