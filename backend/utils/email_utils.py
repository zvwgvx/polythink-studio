import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_NAME = os.getenv("SENDER_NAME")

def send_verification_email(to_email: str, code: str):
    """Send verification code via email."""
    subject = "PolyThink Studio - Verification Code"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #333; text-align: center;">Welcome to PolyThink Studio</h2>
                <p style="color: #666; font-size: 16px;">Hello,</p>
                <p style="color: #666; font-size: 16px;">Thank you for registering. Please use the following verification code to activate your account:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <span style="background-color: #007bff; color: #ffffff; padding: 15px 30px; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px;">{code}</span>
                </div>
                
                <p style="color: #666; font-size: 14px;">This code will expire in 15 minutes.</p>
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">If you didn't request this, please ignore this email.</p>
            </div>
        </body>
    </html>
    """
    
    msg = MIMEMultipart()
    msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    
    msg.attach(MIMEText(html_content, "html"))
    
    try:
        print(f"Attempting to send email to {to_email}...")
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        server.quit()
        print(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {str(e)}")
        raise e

def send_reset_email(to_email: str, code: str):
    """Send password reset code via email."""
    subject = "PolyThink Studio - Password Reset Code"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
                <p style="color: #666; font-size: 16px;">Hello,</p>
                <p style="color: #666; font-size: 16px;">You requested to reset your password. Please use the code below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <span style="background-color: #dc3545; color: #ffffff; padding: 15px 30px; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px;">{code}</span>
                </div>
                
                <p style="color: #666; font-size: 14px;">This code will expire in 15 minutes.</p>
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">If you didn't request this, please ignore this email.</p>
            </div>
        </body>
    </html>
    """
    
    msg = MIMEMultipart()
    msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    
    msg.attach(MIMEText(html_content, "html"))
    
    try:
        print(f"Attempting to send reset email to {to_email}...")
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        server.quit()
        print(f"Reset email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send reset email to {to_email}: {str(e)}")
        raise e

def send_login_otp_email(to_email: str, code: str):
    """Sends a login OTP email."""
    print(f"Sending LOGIN OTP email to {to_email} with code {code}") # Log for debugging
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #000; text-align: center;">Login Verification Code</h2>
                <p>Hello,</p>
                <p>Your login verification code is:</p>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
                    {code}
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you did not request this code, please ignore this email.</p>
                <br>
                <p style="font-size: 12px; color: #888; text-align: center;">PolyThink Studio Secure System</p>
            </div>
        </body>
    </html>
    """
    
    message = MIMEMultipart()
    message["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    message["To"] = to_email
    message["Subject"] = "Your Login Code - PolyThink Studio"
    
    message.attach(MIMEText(html_content, "html"))
    
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
            print(f"Login OTP email sent successfully to {to_email}")
    except Exception as e:
        print(f"Failed to send login OTP email: {e}")
        raise e
