import nodemailer from 'nodemailer';

export interface SendOnboardingEmailOptions {
  to: string;
  recipientName: string;
  role: string;
  departmentName: string;
  rawToken: string;
}

export interface SendPasswordResetEmailOptions {
  to: string;
  recipientName: string;
  rawToken: string;
}

/**
 * Creates and returns a Nodemailer transporter configured via environment variables.
 */
export const createEmailTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER || 'knowvia.testing@gmail.com';
  const pass = process.env.SMTP_PASSWORD || '';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Singleton transporter instance for the application
export const emailTransporter = createEmailTransporter();

/**
 * Sends a branded Knowvia onboarding invitation email with the secure one-time activation link.
 */
export const sendOnboardingEmail = async (options: SendOnboardingEmailOptions): Promise<void> => {
  const { to, recipientName, role, departmentName, rawToken } = options;

  const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
  const senderUser = process.env.SMTP_USER || 'knowvia.testing@gmail.com';
  const onboardingUrl = `${appUrl}/onboarding?token=${encodeURIComponent(rawToken)}`;

  const roleLabel =
    role === 'ADMIN'
      ? 'Administrator'
      : role === 'TUTOR'
      ? 'Department Tutor'
      : 'Intern / Student';

  const subject = `Welcome to Knowvia — Complete Your Account Setup`;

  const textContent = `Welcome to Knowvia

Hello ${recipientName},

An administrator has created a Knowvia account for you.

Assigned Role: ${roleLabel}
Assigned Department: ${departmentName}

To activate your account and set your permanent password, open this link in your browser:
${onboardingUrl}

Important:
• This invitation expires in 24 hours.
• This link can only be used once.
• Do NOT share this link with anyone.

If you were not expecting this email or this invitation was sent to you in error, you can safely ignore it.

—
Knowvia Knowledge Repository & Learning Management Platform
`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Knowvia</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 36px 16px;
    }
    .card {
      max-width: 560px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 36px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
    }
    .brand-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .brand-logo {
      display: inline-block;
      background: #4f46e5;
      color: #ffffff;
      font-weight: 800;
      font-size: 20px;
      padding: 10px 18px;
      border-radius: 10px;
      letter-spacing: -0.02em;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 14px;
      margin-bottom: 4px;
    }
    .brand-tagline {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 24px 0;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .lead-text {
      font-size: 14px;
      color: #334155;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .meta-box {
      background-color: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .meta-row:last-child {
      margin-bottom: 0;
    }
    .meta-label {
      color: #64748b;
      font-weight: 500;
    }
    .meta-value {
      color: #0f172a;
      font-weight: 700;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      background: #e0e7ff;
      color: #4338ca;
    }
    .btn-container {
      text-align: center;
      margin: 30px 0;
    }
    .btn-primary {
      display: inline-block;
      background-color: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 14px 32px;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.25);
    }
    .expiry-note {
      background-color: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
      font-size: 12px;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .fallback-url {
      font-size: 12px;
      color: #64748b;
      word-break: break-all;
      background: #f8fafc;
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      margin-top: 8px;
    }
    .footer-note {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      margin-top: 24px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="brand-header">
        <div class="brand-logo">Knowvia</div>
        <h1 class="brand-title">Welcome to Knowvia</h1>
        <p class="brand-tagline">Progressive Knowledge Repository & Learning Management Platform</p>
      </div>

      <p class="greeting">Hello ${recipientName},</p>
      <p class="lead-text">
        An administrator has created your Knowvia account. You have been provisioned access with the following details:
      </p>

      <div class="meta-box">
        <div class="meta-row">
          <span class="meta-label">Assigned Role:</span>
          <span class="meta-value badge">${roleLabel}</span>
        </div>
        <div class="meta-row" style="margin-top: 8px;">
          <span class="meta-label">Department Workspace:</span>
          <span class="meta-value">${departmentName}</span>
        </div>
        <div class="meta-row" style="margin-top: 8px;">
          <span class="meta-label">Registered Email:</span>
          <span class="meta-value">${to}</span>
        </div>
      </div>

      <div class="btn-container">
        <a href="${onboardingUrl}" class="btn-primary" target="_blank">Complete Account Setup</a>
      </div>

      <div class="expiry-note">
        <strong>Security Notice:</strong> This invitation link is unique to you, can only be used once, and expires in <strong>24 hours</strong>. You will create your own secure password during setup.
      </div>

      <p style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
        If the button above does not work, copy and paste this link into your browser:
      </p>
      <div class="fallback-url">${onboardingUrl}</div>

      <hr class="divider">

      <p class="footer-note">
        If you were not expecting this invitation, you can safely ignore this email.<br>
        &copy; ${new Date().getFullYear()} Knowvia. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    await emailTransporter.sendMail({
      from: `"Knowvia" <${senderUser}>`,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error('Failed to send onboarding email:', error.message || error);
    throw new Error(`Email delivery failed: ${error.message || 'SMTP service error'}`);
  }
};

/**
 * Sends a password reset email with secure token link.
 */
export const sendPasswordResetEmail = async (options: SendPasswordResetEmailOptions): Promise<void> => {
  const { to, recipientName, rawToken } = options;

  const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
  const senderUser = process.env.SMTP_USER || 'knowvia.testing@gmail.com';
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

  const subject = `Knowvia — Password Reset Request`;

  const textContent = `Hello ${recipientName},

We received a request to reset the password for your Knowvia account.

To choose a new password, click the link below:
${resetUrl}

This link is valid for 1 hour and can only be used once.

If you did not request a password reset, you can safely ignore this email. Your account remains secure.

—
Knowvia Platform
`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Reset Your Knowvia Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; }
    .brand { text-align: center; margin-bottom: 20px; }
    .brand span { background: #4f46e5; color: white; font-weight: bold; font-size: 18px; padding: 8px 16px; border-radius: 8px; }
    .btn { display: inline-block; background: #4f46e5; color: white !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand"><span>Knowvia</span></div>
    <h3>Password Reset Request</h3>
    <p>Hello ${recipientName},</p>
    <p>We received a request to reset your password. Click the button below to choose a new password:</p>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
    </div>
    <p style="font-size: 12px; color: #64748b;">This link expires in 1 hour and can only be used once. If you did not request this, you can safely ignore this email.</p>
    <div style="font-size: 11px; color: #94a3b8; word-break: break-all; margin-top: 16px;">
      Fallback link: ${resetUrl}
    </div>
  </div>
</body>
</html>`;

  try {
    await emailTransporter.sendMail({
      from: `"Knowvia" <${senderUser}>`,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error('Failed to send password reset email:', error.message || error);
    throw new Error(`Email delivery failed: ${error.message || 'SMTP service error'}`);
  }
};
