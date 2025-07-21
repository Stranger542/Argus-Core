import torch
import torchvision.transforms as T
from torchvision.models.video import r3d_18
from PIL import Image
import cv2

# Determine the device to run the model on (GPU if available, otherwise CPU)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Initialize the R3D-18 model.
# pretrained=False because we will load our custom trained weights.
model = r3d_18(pretrained=False)
# Modify the final fully connected layer to output 2 classes (fight / non-fight).
model.fc = torch.nn.Linear(model.fc.in_features, 2)

# Load the state dictionary of your trained model.
# map_location ensures the model loads correctly whether you're on CPU or GPU.
try:
    model.load_state_dict(torch.load('models/fight_classifier.pth', map_location=device))
except FileNotFoundError:
    print("Error: 'fight_classifier.pth' not found in 'models/' directory.")
    print("Please ensure you have trained the model using train.py and placed the .pth file there.")
    # Exit or handle gracefully if the model is not found
    import sys
    sys.exit(1)

# Set the model to evaluation mode (disables dropout, batch normalization updates, etc.)
model = model.eval().to(device)

# Define the transformation pipeline for input frames.
# Frames will be resized, converted to PyTorch tensors, and normalized.
transform = T.Compose([
    T.Resize((112, 112)),  # Resize frames to 112x112 as expected by R3D-18
    T.ToTensor(),          # Convert PIL Image or numpy.ndarray to PyTorch Tensor
    T.Normalize(mean=[0.43216, 0.394666, 0.37645], std=[0.22803, 0.22145, 0.216989]) # Normalization for Kinetics dataset
])

def preprocess(frames):
    """
    Preprocesses a list of video frames into a single PyTorch tensor suitable for the model.

    Args:
        frames (list of numpy.ndarray): A list of OpenCV frames (BGR format).

    Returns:
        torch.Tensor: A preprocessed tensor of shape [1, C, T, H, W] on the specified device.
    """
    # Convert BGR OpenCV frames to RGB PIL Images, apply transformations, and stack them.
    # Permute dimensions from [T, C, H, W] to [C, T, H, W] as expected by video models.
    # Add a batch dimension (unsqueeze(0)) and move to the target device.
    frames_rgb_pil = [Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB)) for f in frames]
    transformed_frames = [transform(f) for f in frames_rgb_pil]
    clip = torch.stack(transformed_frames).permute(1, 0, 2, 3).unsqueeze(0).to(device)
    return clip

def predict_fight(frames):
    """
    Predicts the probability of a "fight" event given a sequence of video frames.

    Args:
        frames (list of numpy.ndarray): A list of OpenCV frames (BGR format) representing a video clip.

    Returns:
        float: The probability of the "fight" class (between 0 and 1), or None if inference fails.
    """
    try:
        with torch.no_grad():  # Disable gradient calculation for inference
            clip = preprocess(frames)  # Preprocess the frames
            print("[DEBUG] Input tensor shape to model:", clip.shape)
            out = model(clip)          # Get model output (logits)
            print("[DEBUG] Model raw output:", out)
            probs = torch.softmax(out, dim=1) # Convert logits to probabilities
            print("[DEBUG] Probabilities:", probs)
            # Return the probability of the "fight" class (assuming index 1 for "fight")
            return probs[0][1].item()
    except Exception as e:
        print("[ERROR] Exception in predict_fight:", e)
        return None