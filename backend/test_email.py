import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_NAME = os.getenv("SENDER_NAME")

def test_send_email():
    print("--- Email Configuration ---")
    print(f"Server: {SMTP_SERVER}:{SMTP_PORT}")
    print(f"Username: {SMTP_USERNAME}")
    print(f"Sender: {SENDER_NAME} <{SENDER_EMAIL}>")
    print("---------------------------")

    to_email = "test@polydevs.uk" # Or a temporary email if you have one, but using a domain one for safety
    subject = "Test Email from PolyThink Debugger"
    body = "This is a test email to verify SMTP configuration."

    msg = MIMEMultipart()
    msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        print("Connecting to SMTP server...")
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.set_debuglevel(1) # Enable debug output
        
        print("Starting TLS...")
        server.starttls()
        
        print("Logging in...")
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        
        print(f"Sending email to {to_email}...")
        server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        
        print("Quitting...")
        server.quit()
        print("Email sent successfully!")
        
    except Exception as e:
        print(f"\nERROR: Failed to send email.")
        print(f"Type: {type(e).__name__}")
        print(f"Message: {str(e)}")

if __name__ == "__main__":
    test_send_email()
