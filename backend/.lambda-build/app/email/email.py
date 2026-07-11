import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from app.config import settings

class EmailService:
    async def send_temporary_password_email(self, name: str, email: str, temp_password: str, role: str, login_url: str):
        """Simulates sending an email by printing to stdout and logging, and sends real SMTP email if settings exist."""
        email_content = f"""
========================================================================
NEW USER ONBOARDING EMAIL
========================================================================
Date: {datetime.utcnow().isoformat()}
To: {name} <{email}>
Subject: Welcome to Acme Corp - Your Temporary Password

Hi {name},

Your enterprise account has been created by the system administrator.
Here are your temporary login credentials:

Email: {email}
Temporary Password: {temp_password}
Assigned Role: {role}

Please click the link below to sign in and set your new password:
{login_url}

(Note: You will be forced to change this temporary password upon your first login).

Thank you,
IT Operations Team
========================================================================
"""
        # Log to console stdout
        print(email_content)
        
        # Write to log file
        try:
            with open(settings.EMAIL_LOG_FILE, "a", encoding="utf-8") as f:
                f.write(email_content + "\n")
        except Exception as e:
            print(f"Failed to write email dispatch log: {e}")

        # Send via SMTP if details are configured in .env
        if settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
            try:
                msg = MIMEMultipart()
                msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
                msg["To"] = email
                msg["Subject"] = "Welcome to Acme Corp - Your Temporary Password"
                
                body = f"""Hi {name},

Your enterprise account has been created by the system administrator.
Here are your temporary login credentials:

Email: {email}
Temporary Password: {temp_password}
Assigned Role: {role}

Please click the link below to sign in and set your new password:
{login_url}

(Note: You will be forced to change this temporary password upon your first login).

Thank you,
IT Operations Team
"""
                msg.attach(MIMEText(body, "plain"))
                
                # Establish SMTP connection
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, email, msg.as_string())
                server.quit()
                print(f"SMTP: Verification mail successfully dispatched to {email}")
            except Exception as e:
                print(f"SMTP ERROR: Failed to send email to {email}: {e}")

email_service = EmailService()
