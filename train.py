# train.py
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, ConcatDataset, WeightedRandomSampler
from torchvision import transforms
from tqdm import tqdm
import os
import sys
import numpy as np

# Add the 'src' directory to the Python path to allow imports from it
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))

from utils import AnomalyDataset
from model import get_model
from anomaly_config import NUM_CLASSES, ANOMALY_CLASSES

# --- Configuration ---
# Paths to your datasets' training splits
UCF_CRIME_TRAIN_DIR = "datasets/ucf_crime/train"
# UCF_CRIME_TEST_DIR is explicitly NOT used for training in this version
RWF_TRAIN_DIR = "datasets/rwf_2000/train"


MODEL_SAVE_PATH = "models/anomaly_classifier.pth"
BATCH_SIZE = 4
LEARNING_RATE = 1e-4
EPOCHS = 25 # Increased epochs for better training with augmentation
FRAMES_PER_CLIP = 16

RWF_CLASS_MAPPING = {
    'Fight': 'Fighting',
    'NonFight': 'Normal_Videos'
}

# --- Main execution block ---
if __name__ == '__main__':
    # Ensure the models directory exists
    os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)

    # --- Device Setup: ONLY CUDA ---
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA (GPU) is not available. This model is configured to train only on GPU. Please run on a machine with a supported GPU and CUDA drivers.")
    device = torch.device("cuda")
    print(f"Using device: {device}")

    # --- Data Transformations with Augmentation for Training ---
    train_transform = transforms.Compose([
        transforms.Resize((112, 112)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1, hue=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.43216, 0.394666, 0.37645], std=[0.22803, 0.22145, 0.216989])
    ])

    # --- Datasets and DataLoader ---
    try:
        print(f"Loading UCF-Crime training dataset from: {UCF_CRIME_TRAIN_DIR}")
        # Only load UCF-Crime train split (UCF_CRIME_TEST_DIR is excluded from training)
        ucf_crime_train_dataset = AnomalyDataset(UCF_CRIME_TRAIN_DIR, transform=train_transform, frames_per_clip=FRAMES_PER_CLIP)
        print(f"Loaded {len(ucf_crime_train_dataset)} samples from UCF-Crime train split.")

        print(f"Loading RWF-2000 training dataset from: {RWF_TRAIN_DIR}")
        rwf_train_dataset = AnomalyDataset(RWF_TRAIN_DIR, transform=train_transform, frames_per_clip=FRAMES_PER_CLIP, class_folder_mapping=RWF_CLASS_MAPPING)
        print(f"Loaded {len(rwf_train_dataset)} samples from RWF-2000.")

        # Combine only UCF-Crime train and RWF-2000 train for training
        combined_train_dataset = ConcatDataset([ucf_crime_train_dataset, rwf_train_dataset])
        
        # --- Weighted Sampling for Imbalanced Datasets ---
        class_counts = {i: 0 for i in range(NUM_CLASSES)}
        for _, label in combined_train_dataset:
            class_counts[label] += 1
        
        print("\nClass Distribution in Combined Training Dataset:")
        for i, count in class_counts.items():
            print(f"  Class '{ANOMALY_CLASSES[i]}': {count} samples")

        class_weights = [1.0 / count if count > 0 else 0.0 for count in class_counts.values()]
        sample_weights = [0] * len(combined_train_dataset)
        
        for idx, (_, label) in enumerate(combined_train_dataset):
            sample_weights[idx] = class_weights[label]
        
        sampler = WeightedRandomSampler(
            sample_weights,
            num_samples=len(sample_weights),
            replacement=True
        )

        train_loader = DataLoader(
            combined_train_dataset,
            batch_size=BATCH_SIZE,
            sampler=sampler,
            num_workers=os.cpu_count() // 2 if os.cpu_count() else 0
        )
        print(f"Loaded {len(combined_train_dataset)} total training samples across {NUM_CLASSES} classes: {ANOMALY_CLASSES} with WeightedRandomSampler.")
    except Exception as e:
        print(f"Error loading combined datasets: {e}")
        print(f"Please ensure UCF-Crime is correctly placed at '{UCF_CRIME_TRAIN_DIR}', and RWF-2000 at '{RWF_TRAIN_DIR}'.")
        sys.exit(1)

    # --- Model, Loss, and Optimizer ---
    model = get_model(num_classes=NUM_CLASSES).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    
    # Optional: Learning Rate Scheduler (uncomment to use)
    # scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)

    # --- Training Loop ---
    print("Starting training...")
    for epoch in range(EPOCHS):
        model.train()
        total_loss = 0
        correct_predictions = 0
        total_samples = 0

        for batch_idx, (inputs, labels) in enumerate(tqdm(train_loader, desc=f"Epoch {epoch+1}/{EPOCHS}")):
            inputs, labels = inputs.to(device), labels.to(device)

            outputs = model(inputs)
            loss = criterion(outputs, labels)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            total_loss += loss.item()

            _, predicted = torch.max(outputs.data, 1)
            total_samples += labels.size(0)
            correct_predictions += (predicted == labels).sum().item()

        avg_loss = total_loss / len(train_loader)
        accuracy = (correct_predictions / total_samples) * 100
        print(f"Epoch {epoch+1} - Loss: {avg_loss:.4f}, Train Accuracy: {accuracy:.2f}%\n")
        
        # Optional: Step the scheduler (uncomment if using scheduler)
        # if 'scheduler' in locals():
        #     scheduler.step()

    # --- Save Trained Model ---
    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    print(f"Training complete. Model saved to {MODEL_SAVE_PATH}")
