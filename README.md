# Argus Core: Automated Crime Detection using CCTV Footage

## Overview
Argus Core is a Python-based system for real-time Crime/violence detection in CCTV video streams. It uses deep learning to analyze video, automatically saves evidence clips, and sends email alerts with video attachments when crime/violence is detected.

---

## Features
- **Real-time Crime/Violence detection** using a trained action recognition model
- **Evidence video saving**: Automatically saves the last N seconds of video when a fight is detected
- **Email alerts**: Sends an email with the evidence video attached
- **Configurable detection sensitivity and evidence length**
- **Secure credential management** using `.env` file
- **Windows and cross-platform compatible**

---

## Setup Instructions

### 1. Clone the Repository
```
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
```

### 2. Install Python Dependencies
It is recommended to use a virtual environment:
```
python -m venv venv
venv\Scripts\activate  # On Windows
# or
source venv/bin/activate  # On Linux/Mac

pip install -r requirements.txt
```

### 3. Prepare the Dataset
- Download the RWF-2000 dataset or your own CCTV videos.
- Place them in the `datasets/` directory as described in the code comments.
- The default test path is `datasets/rwf_2000/test/Fight`.
- Run the  `download_nulti_event_datasets.py` to download and organise the `ucf-crime dataset` for training and testing.


### 4. Configure Environment Variables
Create a `.env` file in the project root with the following:
```
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASS=your_app_password_here
ALERT_TO=recipient_email_address@gmail.com
```
- Use a Gmail app password for `SMTP_PASS` (see Google account security settings).
- Never commit your `.env` file to GitHub.

### 5. Model Weights
- Place your trained model weights (e.g., `fight_classifier.pth`) in the `models/` directory.
- Update the model loading path in `model.py` if needed.

### 6. Run the System
```
python src/main.py
```
- The system will select a random fight video from the test set and start detection.
- When a fight is detected, an evidence video (last N seconds) is saved and emailed.

---

## Configuration
- **Evidence video length:** Set `EVIDENCE_SECONDS` in `src/main.py` (e.g., 5 or 10 seconds)
- **Detection sensitivity:** Adjust `ALERT_THRESHOLD` (lower = more sensitive)
- **Minimum hits for alert:** Adjust `MIN_HITS_FOR_ALERT`
- **Email/alert settings:** Edit `.env` file

---

## File Structure
- `src/main.py` — Main detection and alerting loop
- `backend/alert_service.py` — Email alert logic
- `backend/video_storage.py` — Evidence video saving
- `models/` — Model weights
- `datasets/` — Video datasets (not tracked by git)
- `storage/` — Saved evidence videos (not tracked by git)
- `.env` — Email credentials (not tracked by git)

---

## Security & Privacy
- **Never commit your `.env` or dataset files to GitHub.**
- The `.gitignore` is set up to protect sensitive and large files.

---

## Troubleshooting
- If no alerts are triggered, try lowering `ALERT_THRESHOLD` in `main.py`.
- If emails are not sent, check your `.env` credentials and Gmail app password.
- If video is laggy, ensure FPS is set correctly and your machine is performant enough.

---

## License
This project is for educational and research purposes. Please respect privacy and legal requirements when using CCTV footage.

---

## Contact
For questions or contributions, open an issue or pull request on GitHub.
