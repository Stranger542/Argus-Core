import torch
from torch.utils.data import DataLoader
from torchvision import transforms
from tqdm import tqdm
import os
import sys

# Add the 'src' directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))

from utils import FightDataset
from model import get_model

# --- Configuration ---
DATA_ROOT_DIR = "datasets/rwf_2000/test"
MODEL_LOAD_PATH = "models/fight_classifier.pth"
BATCH_SIZE = 1
FRAMES_PER_CLIP = 16

def main():
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
        test_dataset = FightDataset(DATA_ROOT_DIR, transform=transform, frames_per_clip=FRAMES_PER_CLIP)
        test_loader = DataLoader(
            test_dataset,
            batch_size=BATCH_SIZE,
            shuffle=False,
            num_workers=os.cpu_count() // 2 if os.cpu_count() else 0
        )
        print(f"Loaded {len(test_dataset)} testing samples.")
    except Exception as e:
        print(f"Error loading dataset: {e}")
        print(f"Please ensure the dataset is correctly placed at '{DATA_ROOT_DIR}' and FightDataset class is correct.")
        sys.exit(1)

    # --- Model Loading ---
    model = get_model().to(device)
    try:
        model.load_state_dict(torch.load(MODEL_LOAD_PATH, map_location=device))
        print(f"Successfully loaded model from {MODEL_LOAD_PATH}")
    except FileNotFoundError:
        print(f"Error: Model file not found at {MODEL_LOAD_PATH}.")
        print("Please ensure you have trained the model using train.py and placed the .pth file there.")
        sys.exit(1)
    except Exception as e:
        print(f"Error loading model state dictionary: {e}")
        sys.exit(1)

    model.eval()

    # --- Testing Loop ---
    correct = 0
    total = 0
    print("Starting testing...")
    with torch.no_grad():
        for batch_idx, (inputs, labels) in enumerate(tqdm(test_loader, desc="Testing Progress")):
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            _, predicted = torch.max(outputs.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()

    accuracy = (correct / total) * 100
    print(f"\nTest Accuracy: {accuracy:.2f}%")

if __name__ == "__main__":
    main()