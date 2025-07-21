# src/utils.py
import cv2
import os
import torch
from torchvision import transforms
from torch.utils.data import Dataset
from PIL import Image
from collections import deque

class FightDataset(Dataset):
    """
    Custom Dataset for loading video clips for fight detection.
    """
    def __init__(self, root_dir, transform=None, frames_per_clip=16):
        self.root_dir = root_dir
        self.transform = transform
        self.frames_per_clip = frames_per_clip
        self.samples = []

        for label, subfolder in enumerate(["NonFight", "Fight"]):
            folder_path = os.path.join(root_dir, subfolder)
            if not os.path.exists(folder_path):
                print(f"Warning: Dataset subfolder not found: {folder_path}")
                continue
            for video in os.listdir(folder_path):
                path = os.path.join(folder_path, video)
                if os.path.isfile(path) and video.lower().endswith(('.avi', '.mp4', '.mov', '.mkv')):
                    self.samples.append((path, label))
        
        if not self.samples:
            raise ValueError(f"No video samples found in {root_dir}. Please check dataset path and organization.")

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
            raise IndexError("Index out of range in FightDataset")
        video_path, label = self.samples[idx]
        frames = self.read_frames(video_path)
        frames = frames.permute(1, 0, 2, 3)  # [C, T, H, W] for video models
        return frames, label

# ...existing code...

class FightConfidenceQueue:
    """
    Manages a queue of fight probabilities to determine if a sustained alert is needed.
    """
    def __init__(self, max_len=10):
        self.q = deque(maxlen=max_len)

    def update(self, prob):
        self.q.append(prob)

    def should_alert(self, threshold=0.8, min_hits=6):
        """
        Checks if an alert should be triggered based on sustained high confidence.

        Args:
            threshold (float): The minimum probability for a prediction to be considered a "hit".
            min_hits (int): The minimum number of "hits" required in the queue to trigger an alert.

        Returns:
            bool: True if an alert should be triggered, False otherwise.
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

# ...existing code...therwise.
     