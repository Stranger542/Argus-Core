# backend/alert_service.py

import os
import smtplib
from email.message import EmailMessage
from pathlib import Path
from dotenv import load_dotenv
import datetime

# Load environment variables from .env file
load_dotenv()

def send_alert(video_file_path: str, location: str = "Unknown", anomaly_type: str = "Anomaly"):
    """
    Sends an email alert with an attached video clip.
    The email subject and content will now dynamically include the specific anomaly type(s) detected.
    Email credentials are loaded from environment variables (e.g., from a .env file).

    Args:
        video_file_path (str): The path to the video file to attach.
        location (str): The location where the event was detected.
        anomaly_type (str): The specific type(s) of anomaly detected (can be a comma-separated string, e.g., "Fighting, RoadAccident").
    """
    # Load SMTP configuration from environment variables
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT   = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER   = os.getenv("SMTP_USER")
    SMTP_PASS   = os.getenv("SMTP_PASS")
    ALERT_TO    = os.getenv("ALERT_TO")
    ALERT_FROM  = SMTP_USER # Typically, ALERT_FROM is the same as SMTP_USER

    # Check for missing credentials
    if not all([SMTP_USER, SMTP_PASS, ALERT_TO]):
        print("[ERROR] Missing SMTP credentials or recipient in environment variables. Please check your .env file.")
        return

    # Get current real-time date and time
    now = datetime.datetime.now()
    # Format: e.g., "Monday, July 22, 2025 at 03:30 PM"
    formatted_datetime = now.strftime("%A, %B %d, %Y at %I:%M %p")

    msg = EmailMessage()
    # Use anomaly_type in Subject - it can now be a list of types
    msg['Subject'] = f"🚨 Argus Core ALERT: {anomaly_type} Detected at {location} on {formatted_datetime}"
    msg['From'] = ALERT_FROM
    msg['To'] = ALERT_TO
    
    # Use anomaly_type in Body - it can now be a list of types
    email_body = (
        f"Automatic alert from your Argus Core smart-CCTV system.\n\n"
        f"• Anomaly Type(s): {anomaly_type}\n" # Explicitly state anomaly type(s)
        f"• Location         : {location}\n"
        f"• Clip             : {Path(video_file_path).name}\n"
        f"• Time             : {formatted_datetime}\n\n"
        f"Please review the attached footage and take action if necessary."
    )
    msg.set_content(email_body)

    # Attach the video file
    try:
        file_path_obj = Path(video_file_path)
        if not file_path_obj.exists():
            print(f"[ERROR] Video file not found: {video_file_path}")
            msg.set_content(f"An anomaly was detected at {location} on {formatted_datetime}. Video footage could not be attached (file not found).")
        else:
            with open(file_path_obj, "rb") as fp:
                msg.add_attachment(
                    fp.read(),
                    maintype="video",
                    subtype="mp4", # Assuming save_clip now saves as .mp4
                    filename=file_path_obj.name,
                )
    except Exception as e:
        print(f"[ERROR] Error attaching video file: {e}")
        msg.set_content(f"An anomaly was detected at {location} on {formatted_datetime}. Video footage could not be attached due to an error.")


    # Send
    print(f"Sending alert e‑mail to {ALERT_TO} …")
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(msg)
        print(f"✅ Alert e‑mail sent to {ALERT_TO} for {anomaly_type} at {location} ({formatted_datetime}).")
    except Exception as e:
        print(f"[ERROR] Failed to send alert e‑mail: {e}")
        print("Please check your email credentials (App password if 2FA is on), SMTP server settings, and internet connection.")

# Optional: CLI test (only runs if the script is executed directly)
if __name__ == "__main__":
    import sys
    dummy_file_path = Path("test_dummy_video.mp4")
    if not dummy_file_path.exists():
        print(f"Creating dummy file: {dummy_file_path}")
        try:
            with open(dummy_file_path, 'wb') as f:
                f.write(b'\x00\x00\x00\x18ftypmp42\\x00\\x00\\x00\\x00mp42isom\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00')
        except Exception as e:
            print(f"Could not create dummy file: {e}. Please create it manually or provide a real path.")
            sys.exit(1)

    if len(sys.argv) > 1:
        clip_path = sys.argv[1]
        test_location = "CLI-Test-Location"
        test_anomaly_type = "TestAnomaly"
        if len(sys.argv) > 2:
            test_location = sys.argv[2]
        if len(sys.argv) > 3:
            test_anomaly_type = sys.argv[3]
        send_alert(clip_path, location=test_location, anomaly_type=test_anomaly_type)
    else:
        print("Usage: python -m backend.alert_service <path_to_clip> [location] [anomaly_type]")
        print(f"Running a default test email send using dummy file: {dummy_file_path}")
        send_alert(str(dummy_file_path), location="Default-Test-Location", anomaly_type="DefaultAnomaly")

