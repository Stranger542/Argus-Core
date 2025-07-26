# model.py
import torch
import torch.nn as nn
from torchvision.models.video import r3d_18, R3D_18_Weights # Import R3D_18_Weights
import sys
import os

# Add parent directory to sys.path to import anomaly_config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))
from anomaly_config import NUM_CLASSES

def get_model(num_classes=NUM_CLASSES, weights=R3D_18_Weights.DEFAULT):
    """
    Initializes and returns the R3D-18 model adapted for multi-class classification.

    The R3D-18 model is pre-trained on the Kinetics-400 dataset, which provides
    a strong base for action recognition tasks. The final classification layer
    is replaced to suit our specific multi-class anomaly classification.

    Args:
        num_classes (int): The number of output classes for the model.
        weights: Pretrained weights to use. Default is R3D_18_Weights.DEFAULT.
                 This addresses the 'pretrained=True' deprecation.

    Returns:
        torch.nn.Module: The configured R3D-18 model.
    """
    # Load the R3D-18 model with pre-trained weights from Kinetics-400.
    # Using weights=R3D_18_Weights.DEFAULT instead of pretrained=True
    model = r3d_18(weights=weights)

    # Replace the final fully connected layer for multi-class classification.
    model.fc = nn.Linear(model.fc.in_features, num_classes)

    return model

if __name__ == "__main__":
    # Quick test to verify model structure
    model = get_model(num_classes=NUM_CLASSES) # Use NUM_CLASSES from anomaly_config
    print(model)
    # Example input: batch_size=1, channels=3, frames=16, height=112, width=112
    x = torch.randn(1, 3, 16, 112, 112)
    out = model(x)
    print("Output shape:", out.shape)
    print("Expected output classes:", NUM_CLASSES)
