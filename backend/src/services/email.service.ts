import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️  SMTP not configured — printing email to console instead:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${text || "(HTML content)"}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return;
  }

  await transporter.sendMail({
    from: `"Precision Nav" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getOTPEmailHtml(otp: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 56px; height: 56px; background: #0d9488; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
          <span style="color: white; font-size: 28px;">🔐</span>
        </div>
        <h1 style="color: #111827; font-size: 22px; margin: 0;">Password Reset OTP</h1>
        <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0 0;">Use the code below to reset your vendor account password.</p>
      </div>
      <div style="background: white; padding: 32px; border-radius: 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">Your One-Time Password</p>
        <div style="background: #f3f4f6; padding: 16px 24px; border-radius: 12px; display: inline-block; letter-spacing: 8px; font-size: 32px; font-weight: bold; color: #0d9488;">
          ${otp}
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0;">This code expires in 10 minutes.</p>
      </div>
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
        If you didn't request this, please ignore this email.<br/>
        &copy; 2026 Precision Nav Logistics. All rights reserved.
      </p>
    </div>
  `;
}
