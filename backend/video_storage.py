import cv2
import os
import datetime

# Ensure the 'storage' directory exists
os.makedirs('storage', exist_ok=True)

def save_clip(frames, base_filename="fight_clip", fps=10):
    """
    Saves a list of video frames as an MP4 file.

    Args:
        frames (list of numpy.ndarray): A list of OpenCV frames (BGR format) to save.
        base_filename (str): The base name for the output video file.
        fps (float): Frames per second for the output video.
                     A timestamp will be appended to ensure uniqueness.

    Returns:
        str: The full path to the saved video file, or None if saving failed.
    """
    if not frames:
        print("No frames provided to save.")
        return None

    # Get dimensions from the first frame
    h, w, _ = frames[0].shape

    # Generate a unique filename with a timestamp
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{base_filename}_{timestamp}.mp4"
    filepath = os.path.join('storage', filename)

    # Use the provided fps, but ensure it's a reasonable value
    try:
        fps = float(fps)
        if fps < 1 or fps > 120:
            print(f"[WARNING] Unusual FPS value ({fps}), defaulting to 10.")
            fps = 10
    except Exception:
        print(f"[WARNING] Invalid FPS value ({fps}), defaulting to 10.")
        fps = 10

    # Define the video writer for mp4 format
    out = cv2.VideoWriter(filepath, cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h))

    if not out.isOpened():
        print(f"Error: Could not open video writer for {filepath}")
        return None

    # Write each frame to the video file
    for f in frames:
        out.write(f)

    # Release the video writer
    out.release()
    print(f"Video clip saved to: {filepath}")
    return filepath