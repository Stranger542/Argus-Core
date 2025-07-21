import torch
import torch.nn as nn
from torchvision.models.video import r3d_18, R3D_18_Weights

def get_model(weights=R3D_18_Weights.DEFAULT):
    """
    Initializes and returns the R3D-18 model adapted for binary classification.

    The R3D-18 model is pre-trained on the Kinetics-400 dataset, which provides
    a strong base for action recognition tasks. The final classification layer
    is replaced to suit our specific "fight" vs. "non-fight" binary classification.

    Args:
        weights: Pretrained weights to use. Default is R3D_18_Weights.DEFAULT.

    Returns:
        torch.nn.Module: The configured R3D-18 model.
    """
    # Load the R3D-18 model with pre-trained weights from Kinetics-400.
    model = r3d_18(weights=weights)

    # Replace the final fully connected layer for binary classification.
    model.fc = nn.Linear(model.fc.in_features, 2)

    return model

if __name__ == "__main__":
    # Quick test to verify model structure
    model = get_model()
    print(model)
    # Example input: batch_size=1, channels=3, frames=16, height=112, width=112
    x = torch.randn(1, 3, 16, 112, 112)
    out = model(x)
    print("Output shape:", out.shape)