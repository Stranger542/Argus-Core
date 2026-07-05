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
CLASS_TO_IDX = {cls_name: i for i, cls_name in enumerate(ANOMALY_CLASSES)}
IDX_TO_CLASS = {i: cls_name for i, cls_name in enumerate(ANOMALY_CLASSES)}
NUM_CLASSES = len(ANOMALY_CLASSES)
ALERT_ANOMALY_CLASSES = [cls for cls in ANOMALY_CLASSES if cls != "Normal_Videos"]

