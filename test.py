# test.py
import torch
from torch.utils.data import DataLoader
from torchvision import transforms
from tqdm import tqdm
import os
import sys

# Add the 'src' directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))

from utils import AnomalyDataset
from model import get_model
from anomaly_config import NUM_CLASSES, ANOMALY_CLASSES, IDX_TO_CLASS

# --- Configuration ---
UCF_CRIME_TEST_DIR = "datasets/ucf_crime/test"

MODEL_LOAD_PATH = "models/anomaly_classifier.pth"
BATCH_SIZE = 1
FRAMES_PER_CLIP = 16

# --- Main execution block ---
if __name__ == '__main__':
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # --- Data Transformations (No Augmentation for Testing) ---
    transform = transforms.Compose([
        transforms.Resize((112, 112)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.43216, 0.394666, 0.37645], std=[0.22803, 0.22145, 0.216989])
    ])

    try:
        print(f"Loading UCF-Crime testing dataset from: {UCF_CRIME_TEST_DIR}")
        test_dataset = AnomalyDataset(UCF_CRIME_TEST_DIR, transform=transform, frames_per_clip=FRAMES_PER_CLIP)
        print(f"Loaded {len(test_dataset)} samples from UCF-Crime for testing.")

        test_loader = DataLoader(
            test_dataset,
            batch_size=BATCH_SIZE,
            shuffle=False,
            num_workers=os.cpu_count() // 2 if os.cpu_count() else 0
        )
        print(f"Loaded {len(test_dataset)} total testing samples across {NUM_CLASSES} classes: {ANOMALY_CLASSES}.")
    except Exception as e:
        print(f"Error loading UCF-Crime test dataset: {e}")
        print(f"Please ensure UCF-Crime is correctly placed at '{UCF_CRIME_TEST_DIR}'.")
        sys.exit(1)

    model = get_model(num_classes=NUM_CLASSES).to(device)
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

    correct = 0
    total = 0
    
    correct_per_class = {i: 0 for i in range(NUM_CLASSES)}
    total_per_class = {i: 0 for i in range(NUM_CLASSES)}

    print("Starting testing...")
    with torch.no_grad():
        for batch_idx, (inputs, labels) in enumerate(tqdm(test_loader, desc="Testing Progress")):
            inputs, labels = inputs.to(device), labels.to(device)

            outputs = model(inputs)
            _, predicted = torch.max(outputs.data, 1)

            total += labels.size(0)
            correct += (predicted == labels).sum().item()

            for i in range(labels.size(0)):
                label = labels[i].item()
                pred = predicted[i].item()
                total_per_class[label] += 1
                if label == pred:
                    correct_per_class[label] += 1

    accuracy = (correct / total) * 100
    print(f"\nOverall Test Accuracy: {accuracy:.2f}%")

    print("\n--- Class-wise Accuracy ---")
    for i in range(NUM_CLASSES):
        class_name = IDX_TO_CLASS[i]
        class_total = total_per_class[i]
        class_correct = correct_per_class[i]
        class_accuracy = (class_correct / class_total) * 100 if class_total > 0 else 0.0
        print(f"Class '{class_name}' ({class_total} samples): {class_accuracy:.2f}%")
