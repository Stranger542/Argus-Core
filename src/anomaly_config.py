# src/anomaly_config.py

# Define the list of anomaly classes.
# These should match the folder names in your datasets/ucf_crime/train and test directories.
# For RWF-2000, 'Fight' will map to 'Fighting', and 'NonFight' will map to 'Normal_Videos'.
# The order here defines the integer labels (0, 1, 2, ...).
ANOMALY_CLASSES = [
    "Normal_Videos",    # Class 0: Non-anomaly
    "Abuse",            # Class 1
    "Arrest",           # Class 2
    "Arson",            # Class 3: Fires
    "Assault",          # Class 4 (Note: UCF-Crime has both 'Fighting' and 'Assault')
    "Burglary",         # Class 5
    "Explosion",        # Class 6
    "Fighting",         # Class 7: Fight detection
    "RoadAccident",     # Class 8: Vehicle crashes
    "Robbery",          # Class 9
    "Shooting",         # Class 10
    "Shoplifting",      # Class 11
    "Stealing",         # Class 12
    "Vandalism",        # Class 13
]

# Create a mapping from class name to integer label
CLASS_TO_IDX = {cls_name: i for i, cls_name in enumerate(ANOMALY_CLASSES)}

# Create a mapping from integer label back to class name
IDX_TO_CLASS = {i: cls_name for i, cls_name in enumerate(ANOMALY_CLASSES)}

# Number of output classes for the model
NUM_CLASSES = len(ANOMALY_CLASSES)

# Define which classes are considered "alert-worthy" anomalies (excluding Normal_Videos)
ALERT_ANOMALY_CLASSES = [cls for cls in ANOMALY_CLASSES if cls != "Normal_Videos"]

