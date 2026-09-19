import os
import smtplib
import mimetypes # <-- NEW IMPORT
from email.message import EmailMessage
from pathlib import Path
from dotenv import load_dotenv
import datetime
load_dotenv()

def send_alert(
    video_file_path: str, 
    location: str = "Unknown", 
    anomaly_type: str = "Anomaly",
    additional_recipient: str | None = None,
    image_file_path: str | None = None,  # <-- NEW PARAMETER
    image_metadata: str | None = None    # <-- NEW PARAMETER
):
    """
    Sends an email alert with an attached video clip and an optional enhanced snapshot.
    """
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT   = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER   = os.getenv("SMTP_USER")
    SMTP_PASS   = os.getenv("SMTP_PASS")
    ALERT_TO    = os.getenv("ALERT_TO")
    ALERT_FROM  = SMTP_USER

    if not all([SMTP_USER, SMTP_PASS, ALERT_TO]):
        print("[ERROR] Missing SMTP credentials. Please check your .env file.")
        return

    recipients = [ALERT_TO]
    if additional_recipient and additional_recipient.lower() != ALERT_TO.lower():
        recipients.append(additional_recipient)
        
    now = datetime.datetime.now()
    formatted_datetime = now.strftime("%A, %B %d, %Y at %I:%M %p")

    msg = EmailMessage()
    msg['Subject'] = f"Argus Core ALERT: {anomaly_type} Detected at {location} on {formatted_datetime}"
    msg['From'] = ALERT_FROM
    msg['To'] = ", ".join(recipients)
    
    # Update email body with image metadata
    email_body = (
        f"Automatic alert from your Argus Core smart-CCTV system.\n\n"
        f"• Anomaly Type(s): {anomaly_type}\n"
        f"• Location         : {location}\n"
        f"• Time             : {formatted_datetime}\n"
    )
    if image_metadata:
        email_body += f"• Snapshot Info    : {image_metadata}\n"
        
    email_body += f"\nPlease review the attached evidence and take action if necessary."
    msg.set_content(email_body)

    # 1. Attach the Video File
    try:
        vid_path_obj = Path(video_file_path)
        if vid_path_obj.exists():
            with open(vid_path_obj, "rb") as fp:
                msg.add_attachment(
                    fp.read(),
                    maintype="video",
                    subtype="mp4",
                    filename=vid_path_obj.name,
                )
    except Exception as e:
        print(f"[ERROR] Error attaching video file: {e}")

    # 2. Attach the Enhanced Image File
    if image_file_path:
        try:
            img_path_obj = Path(image_file_path)
            if img_path_obj.exists():
                ctype, encoding = mimetypes.guess_type(str(img_path_obj))
                if ctype is None or encoding is not None:
                    ctype = 'application/octet-stream'
                maintype, subtype = ctype.split('/', 1)
                with open(img_path_obj, "rb") as fp:
                    msg.add_attachment(
                        fp.read(),
                        maintype=maintype,
                        subtype=subtype,
                        filename=img_path_obj.name,
                    )
        except Exception as e:
            print(f"[ERROR] Error attaching image file: {e}")

    print(f"Sending alert e-mail to {', '.join(recipients)} ...")
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(msg) 
        print(f"✅ Alert e-mail sent to {', '.join(recipients)}.")
    except Exception as e:
        print(f"[ERROR] Failed to send alert e-mail: {e}")
        print("Please check your email credentials (App password if 2FA is on), SMTP server settings, and internet connection.")

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
        test_additional_recipient = None 
        if len(sys.argv) > 2:
            test_location = sys.argv[2]
        if len(sys.argv) > 3:
            test_anomaly_type = sys.argv[3]
        if len(sys.argv) > 4:
            test_additional_recipient = sys.argv[4] 

        send_alert(
            clip_path, 
            location=test_location, 
            anomaly_type=test_anomaly_type,
            additional_recipient=test_additional_recipient 
        )
    else:
        print("Usage: python -m backend.alert_service <path_to_clip> [location] [anomaly_type] [additional_email]")
        print(f"Running a default test email send using dummy file: {dummy_file_path}")
        send_alert(
            str(dummy_file_path), 
            location="Default-Test-Location", 
            anomaly_type="DefaultAnomaly",
            additional_recipient="testuser@example.com" 
        )