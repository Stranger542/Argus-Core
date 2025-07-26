# download_dataset.py
import kagglehub
import os
import shutil
from sklearn.model_selection import train_test_split
import random

def download_and_organize_rwf2000_dataset(target_base_dir="datasets/rwf_2000", test_size=0.2, random_state=42):
    """
    Downloads the RWF-2000 dataset from Kaggle Hub and organizes it
    into train/test splits for Fight and NonFight classes.

    Args:
        target_base_dir (str): The base directory where the organized dataset will be placed.
                                Expected: datasets/rwf_2000
        test_size (float): The proportion of the dataset to include in the test split.
        random_state (int): Seed for random number generator for reproducibility.
    """
    print("Attempting to download RWF-2000 dataset from Kaggle Hub...")
    download_path = None
    try:
        # Download latest version of the dataset
        # This will typically download to a cache directory like ~/.kaggle/kagglehub/datasets/vulamnguyen/rwf2000/
        download_path = kagglehub.dataset_download("vulamnguyen/rwf2000")
        print(f"Dataset downloaded successfully to: {download_path}")

    except Exception as e:
        print(f"Error downloading dataset: {e}")
        print("Please ensure you have Kaggle API credentials configured correctly (run 'kaggle configure')")
        print("or that your 'kaggle.json' file is in '~/.kaggle/'.")
        return

    # Determine the actual root of the RWF-2000 content within the downloaded path
    # The downloaded ZIP usually extracts to a folder like 'rwf2000' or 'RWF-2000'
    # and then contains 'Fight' and 'NonFight' inside.
    dataset_content_path = None
    for root, dirs, files in os.walk(download_path):
        if 'Fight' in dirs and 'NonFight' in dirs:
            dataset_content_path = root
            break
    
    if not dataset_content_path:
        print(f"Error: Could not find 'Fight' and 'NonFight' subdirectories in the downloaded path: {download_path}")
        print("Please check the structure of the downloaded dataset manually.")
        return

    print(f"Found dataset content at: {dataset_content_path}")

    # Define target directories
    train_fight_dir = os.path.join(target_base_dir, "train", "Fight")
    train_nonfight_dir = os.path.join(target_base_dir, "train", "NonFight")
    test_fight_dir = os.path.join(target_base_dir, "test", "Fight")
    test_nonfight_dir = os.path.join(target_base_dir, "test", "NonFight")

    # Create target directories
    os.makedirs(train_fight_dir, exist_ok=True)
    os.makedirs(train_nonfight_dir, exist_ok=True)
    os.makedirs(test_fight_dir, exist_ok=True)
    os.makedirs(test_nonfight_dir, exist_ok=True)

    print(f"Organizing dataset into {target_base_dir}...")

    # Process Fight videos
    fight_videos = [f for f in os.listdir(os.path.join(dataset_content_path, "Fight")) if f.endswith(('.avi', '.mp4'))]
    train_fights, test_fights = train_test_split(fight_videos, test_size=test_size, random_state=random_state)

    for video_file in train_fights:
        shutil.move(os.path.join(dataset_content_path, "Fight", video_file), os.path.join(train_fight_dir, video_file))
    for video_file in test_fights:
        shutil.move(os.path.join(dataset_content_path, "Fight", video_file), os.path.join(test_fight_dir, video_file))
    print(f"Moved {len(train_fights)} fight videos to train, {len(test_fights)} to test.")

    # Process NonFight videos
    nonfight_videos = [f for f in os.listdir(os.path.join(dataset_content_path, "NonFight")) if f.endswith(('.avi', '.mp4'))]
    train_nonfights, test_nonfights = train_test_split(nonfight_videos, test_size=test_size, random_state=random_state)

    for video_file in train_nonfights:
        shutil.move(os.path.join(dataset_content_path, "NonFight", video_file), os.path.join(train_nonfight_dir, video_file))
    for video_file in test_nonfights:
        shutil.move(os.path.join(dataset_content_path, "NonFight", video_file), os.path.join(test_nonfight_dir, video_file))
    print(f"Moved {len(train_nonfights)} non-fight videos to train, {len(test_nonfights)} to test.")

    # Clean up the original downloaded (now empty) directories if they are within the download_path
    # This part can be tricky if the download_path is a shared cache.
    # It's safer to leave the cache managed by kagglehub and just move the files.
    # If the user wants to remove the original downloaded folder, they can do so manually.
    print(f"\nDataset organization complete. Files are now in '{target_base_dir}'.")
    print("The original downloaded files might still be in the KaggleHub cache, which is normal.")


if __name__ == "__main__":
    # Ensure sklearn is installed for train_test_split: pip install scikit-learn
    # Ensure kagglehub is installed: pip install kagglehub
    download_and_organize_rwf2000_dataset()