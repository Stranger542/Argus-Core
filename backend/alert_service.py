
# --- Modern, robust email alert service ---

import os
import smtplib
from email.message import EmailMessage
from pathlib import Path
from dotenv import load_dotenv


# Load environment variables from .env file
load_dotenv()

# Read SMTP config from environment variables
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT   = int(os.getenv("SMTP_PORT", 587))
SMTP_USER   = os.getenv("SMTP_USER")
SMTP_PASS   = os.getenv("SMTP_PASS")
ALERT_TO    = os.getenv("ALERT_TO")
ALERT_FROM  = SMTP_USER

def send_alert(video_path: str, location: str = "Unknown"):
    """
    Send an e‑mail with the video clip attached.
    Args:
        video_path : path to .avi clip produced by save_clip()
        location   : text string (camera ID / RTSP URL / physical place)
    """

    # Check for missing credentials
    if not all([SMTP_USER, SMTP_PASS, ALERT_TO]):
        print("[ERROR] Missing SMTP credentials or recipient in environment variables. Please check your .env file.")
        return

    file = Path(video_path)
    if not file.exists():
        print(f"[ERROR] Video file not found: {video_path}")
        return

    msg = EmailMessage()
    msg["Subject"] = "🚨 CCTV Alert: Possible Fight Detected"
    msg["From"]    = ALERT_FROM
    msg["To"]      = ALERT_TO

    msg.set_content(
        f"""
Automatic alert from your smart‑CCTV system.

• Location : {location}
• Clip     : {file.name}
• Time     : {file.stat().st_mtime_ns}

Please review the attached footage and take action if necessary.
""")


    # Attach video (MIME type video/mp4 for .mp4)
    with open(file, "rb") as fp:
        msg.add_attachment(
            fp.read(),
            maintype="video",
            subtype="mp4",
            filename=file.name,
        )

    # Send
    print(f"Sending alert e‑mail to {ALERT_TO} …")
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(msg)
        print("✅  Alert e‑mail sent.")
    except Exception as e:
        print(f"[ERROR] Failed to send alert e‑mail: {e}")

# Optional: CLI test
if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python -m backend.alert_service <path_to_clip>")
    else:
        send_alert(sys.argv[1], location="Manual‑test")