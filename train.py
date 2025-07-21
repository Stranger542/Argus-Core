import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import transforms
from tqdm import tqdm
import os
import sys

# Add the 'src' directory to the Python path to allow imports from it
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))

from utils import FightDataset
from model import get_model

# --- Configuration ---
DATA_ROOT_DIR = "datasets/rwf_2000/train"
MODEL_SAVE_PATH = "models/fight_classifier.pth"
BATCH_SIZE = 4
LEARNING_RATE = 1e-4
EPOCHS = 10
FRAMES_PER_CLIP = 16

def main():
    # Ensure the models directory exists
    model_dir = os.path.dirname(MODEL_SAVE_PATH)
    if model_dir and not os.path.exists(model_dir):
        os.makedirs(model_dir, exist_ok=True)

    # --- Device Setup ---
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA (GPU) is not available. Please run on a machine with a supported GPU and CUDA drivers.")
    device = torch.device("cuda")
    print(f"Using device: {device}")

    # --- Data Transformations ---
    transform = transforms.Compose([
        transforms.Resize((112, 112)),  # Ensure all frames are the same size
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.43216, 0.394666, 0.37645], std=[0.22803, 0.22145, 0.216989])
    ])

    # --- Dataset and DataLoader ---
    try:
        train_dataset = FightDataset(DATA_ROOT_DIR, transform=transform, frames_per_clip=FRAMES_PER_CLIP)
        train_loader = DataLoader(
            train_dataset,
            batch_size=BATCH_SIZE,
            shuffle=True,
            num_workers=os.cpu_count() // 2 if os.cpu_count() else 0
        )
        print(f"Loaded {len(train_dataset)} training samples.")
    except Exception as e:
        print(f"Error loading dataset: {e}")
        print(f"Please ensure the dataset is correctly placed at '{DATA_ROOT_DIR}' and FightDataset class is correct.")
        sys.exit(1)

    # --- Model, Loss, and Optimizer ---
    model = get_model().to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)

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

    # --- Save Trained Model ---
    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    print(f"Training complete. Model saved to {MODEL_SAVE_PATH}")

if __name__ == "__main__":
    main()