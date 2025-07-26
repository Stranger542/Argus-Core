# download_multi_event_datasets.py
import kagglehub
import os
import shutil
from sklearn.model_selection import train_test_split
import random
import sys
import time # Import time for sleep

# Add parent directory to sys.path to import anomaly_config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))
from anomaly_config import ANOMALY_CLASSES # Import ANOMALY_CLASSES for validation

def download_and_organize_ucf_crime_dataset(
    target_base_dir="datasets/ucf_crime",
    kaggle_dataset_id="minhajuddinmeraj/anomalydetectiondatasetucf", # Default for UCF-Crime
    test_size=0.2, # Default split for this function, will be overridden for UCF-Crime
    random_state=42,
    selected_classes=None # e.g., ['RoadAccident', 'Arson', 'Vandalism', 'Fighting', 'Normal_Videos']
):
    """
    Downloads a UCF-Crime-like dataset from Kaggle Hub, copies it to a temporary raw location
    within the project, and then robustly organizes it into train/test splits.

    Args:
        target_base_dir (str): The base directory where the organized dataset will be placed.
                                Expected: datasets/ucf_crime or datasets/rwf_2000
        kaggle_dataset_id (str): The Kaggle dataset ID to download.
        test_size (float): The proportion of the dataset to include in the test split.
        random_state (int): Seed for random number generator for reproducibility.
        selected_classes (list, optional): A list of specific class folder names to organize.
                                           If None, attempts to organize all detected classes
                                           that are defined in anomaly_config.ANOMALY_CLASSES.
    """
    print(f"Attempting to download dataset '{kaggle_dataset_id}' from Kaggle Hub...")
    cache_download_path = None
    try:
        cache_download_path = kagglehub.dataset_download(kaggle_dataset_id)
        print(f"Dataset downloaded/cached successfully to: {cache_download_path}")

    except Exception as e:
        print(f"Error downloading dataset '{kaggle_dataset_id}': {e}")
        print("Please ensure you have Kaggle API credentials configured correctly (run 'kaggle configure')")
        print("or that your 'kaggle.json' file is in '~/.kaggle/'.")
        return

    # --- CRUCIAL CLEANUP STEP for target_base_dir ---
    if os.path.exists(target_base_dir):
        print(f"Clearing existing organized directory: {target_base_dir}...")
        try:
            shutil.rmtree(target_base_dir)
            print(f"Successfully cleared {target_base_dir}.")
        except Exception as e:
            print(f"Error clearing directory {target_base_dir}: {e}")
            print("Please manually delete this directory and try again.")
            return
    os.makedirs(target_base_dir, exist_ok=True) # Recreate the base directory for organized data


    # --- Copy raw downloaded content to a temporary location within project datasets ---
    raw_data_temp_path = os.path.join(target_base_dir, "raw_downloads_temp")
    
    print(f"Copying raw data from cache to temporary project location: {raw_data_temp_path}...")
    if os.path.exists(raw_data_temp_path):
        shutil.rmtree(raw_data_temp_path)
        time.sleep(0.5)
    
    try:
        shutil.copytree(cache_download_path, raw_data_temp_path)
        print(f"Raw data copied to: {raw_data_temp_path}")
    except Exception as e:
        print(f"Error copying raw data from cache to project: {e}")
        print("Please check permissions or disk space. Cannot proceed with organization.")
        return


    # --- Step 1: Discover all actual video files grouped by their anomaly class name ---
    all_videos_by_class = {}

    print(f"Recursively searching for video files within temporary raw data: {raw_data_temp_path}")
    for root, dirs, files in os.walk(raw_data_temp_path):
        for file in files:
            if file.lower().endswith(('.avi', '.mp4', '.mov', '.mkv')):
                video_path = os.path.join(root, file)
                
                class_name_found = None
                temp_path = root
                
                while temp_path and temp_path != raw_data_temp_path and len(temp_path) > len(raw_data_temp_path):
                    parent_dir_name = os.path.basename(temp_path)
                    
                    if parent_dir_name in ANOMALY_CLASSES:
                        class_name_found = parent_dir_name
                        break
                    temp_path = os.path.dirname(temp_path)
                
                if class_name_found:
                    if class_name_found not in all_videos_by_class:
                        all_videos_by_class[class_name_found] = []
                    all_videos_by_class[class_name_found].append(video_path)
                else:
                    inferred_class = None
                    for known_class in ANOMALY_CLASSES:
                        if known_class.lower() in file.lower():
                            inferred_class = known_class
                            break
                    if inferred_class:
                        if inferred_class not in all_videos_by_class:
                            all_videos_by_class[inferred_class] = []
                        all_videos_by_class[inferred_class].append(video_path)


    if not all_videos_by_class:
        print(f"Error: No video files found for any known anomaly class in the copied raw dataset '{kaggle_dataset_id}'.")
        print("Please manually inspect the raw downloaded dataset structure and ensure it contains video files within recognizable class folders.")
        return

    print("\n--- Detected Anomaly Classes and Video Counts ---")
    for cls, videos in all_videos_by_class.items():
        print(f"Class '{cls}': {len(videos)} videos")
    print("-------------------------------------------------")

    # --- Step 2: Filter and Organize based on selected_classes ---
    final_classes_to_process = []
    if selected_classes:
        for cls in selected_classes:
            if cls in all_videos_by_class:
                final_classes_to_process.append(cls)
            else:
                print(f"Warning: Selected class '{cls}' not found in detected videos. Skipping.")
    else:
        final_classes_to_process = [cls for cls in all_videos_by_class.keys() if cls in ANOMALY_CLASSES]
    
    if not final_classes_to_process:
        print("No relevant classes to process after filtering. Exiting.")
        print("Please ensure your anomaly_config.py ANOMALY_CLASSES list matches the actual class folders containing videos.")
        return

    print(f"\nClasses to be organized: {final_classes_to_process}")

    # Organize each class into train/test splits
    for class_name in final_classes_to_process:
        videos_for_this_class = all_videos_by_class[class_name]
        
        train_class_dir = os.path.join(target_base_dir, "train", class_name)
        test_class_dir = os.path.join(target_base_dir, "test", class_name)

        os.makedirs(train_class_dir, exist_ok=True)
        os.makedirs(test_class_dir, exist_ok=True)

        print(f"\nOrganizing class: {class_name} ({len(videos_for_this_class)} videos)")
        
        if not videos_for_this_class:
            print(f"No videos found for class {class_name}. Skipping organization for this class.")
            continue

        # Apply the train_test_split based on the test_size parameter
        videos_to_move_to_train, videos_to_move_to_test = train_test_split(videos_for_this_class, test_size=test_size, random_state=random_state)

        for video_file_path in videos_to_move_to_train:
            try:
                shutil.move(video_file_path, os.path.join(train_class_dir, os.path.basename(video_file_path)))
            except FileNotFoundError: print(f"Warning: File not found during move (already moved?): {video_file_path}")
            except Exception as e: print(f"Error moving {video_file_path} to {train_class_dir}: {e}")
        
        for video_file_path in videos_to_move_to_test:
            try:
                shutil.move(video_file_path, os.path.join(test_class_dir, os.path.basename(video_file_path)))
            except FileNotFoundError: print(f"Warning: File not found during move (already moved?): {video_file_path}")
            except Exception as e: print(f"Error moving {video_file_path} to {test_class_dir}: {e}")

        print(f"Moved {len(videos_to_move_to_train)} videos to train, {len(videos_to_move_to_test)} to test for class '{class_name}'.")

    print(f"\nDataset organization complete. Files are now in '{target_base_dir}'.")
    print("The original downloaded files might still be in the KaggleHub cache, which is normal.")
    
    # --- Final Cleanup: Remove the temporary raw downloads folder ---
    if os.path.exists(raw_data_temp_path):
        print(f"Cleaning up temporary raw downloads folder: {raw_data_temp_path}")
        shutil.rmtree(raw_data_temp_path)
        print("Temporary raw downloads folder removed.")


if __name__ == "__main__":
    # --- IMPORTANT ---
    # Ensure you have Kaggle API credentials configured before running:
    # 1. Go to Kaggle.com, log in, go to your profile, then "Account", and click "Create New API Token".
    # 2. This downloads `kaggle.json`. Place this file in a `.kaggle` folder in your user's home directory
    #    (e.g., C:\Users\YourUser\.kaggle\ on Windows, or ~/.kaggle/ on Linux/macOS).

    # --- Run this script from your Argus_Core/ directory ---
    # python download_multi_event_datasets.py

    # Define dataset IDs here for standalone execution.
    UCF_CRIME_TRAIN_ID = "minhajuddinmeraj/anomalydetectiondatasetucf"
    RWF_2000_ID = "vulamnguyen/rwf2000"
    
    # --- Organizing UCF-Crime for Training and Testing (with increased test size) ---
    print("\n--- Organizing UCF-Crime for Training and Testing ---")
    download_and_organize_ucf_crime_dataset(
        target_base_dir="datasets/ucf_crime",
        kaggle_dataset_id=UCF_CRIME_TRAIN_ID,
        test_size=0.4, # Increased test_size to 40% for UCF-Crime
        selected_classes=None # Process all classes in anomaly_config.py
    )

    print("\n--- Organizing RWF-2000 for Training ---")
    download_and_organize_ucf_crime_dataset(
        target_base_dir="datasets/rwf_2000",
        kaggle_dataset_id=RWF_2000_ID,
        test_size=0.2 # Keep default RWF-2000 split for its train/test
    )
