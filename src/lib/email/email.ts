import { Resend } from 'resend';
import { env } from '../env';

const resend = new Resend(env.RESEND_API_KEY);

const FROM_EMAIL = env.RESEND_FROM_EMAIL;
const FROM_NAME = env.RESEND_FROM_NAME;
const APP_NAME = env.APP_NAME;
const APP_URL = env.APP_URL;

interface SendPasswordResetEmailParams {
  email: string;
  resetUrl: string;
  username: string;
}

interface SendRegistrationConfirmationParams {
  email: string;
  username: string;
  firstName: string;
}

/**
 * Escape HTML special characters to prevent injection attacks
 * @param text Text to escape
 * @returns Escaped HTML-safe text
 */
function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char])
}

/**
 * Escape plain text to prevent injection attacks
 * @param text Text to escape
 * @returns Escaped text
 */
function escapeText(text: string): string {
  return text.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&',
      '<': '<',
      '>': '>',
      '"': '"',
      "'": "'",
    }
    return map[char]
  })
}

/**
 * Generate the HTML template for password reset email
 * All user inputs are escaped to prevent email injection attacks
 */
function generateResetEmailTemplate(resetUrl: string, username: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 30px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
    }
    h1 {
      font-size: 20px;
      margin: 0 0 20px 0;
      color: #1f2937;
    }
    .content {
      margin-bottom: 30px;
      color: #4b5563;
    }
    .cta-button {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .cta-button:hover {
      background-color: #1d4ed8;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #fbbf24;
      padding: 12px 15px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
    }
    .footer {
      border-top: 1px solid #e0e0e0;
      padding-top: 20px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
    .reset-url {
      background-color: #f3f4f6;
      padding: 12px 15px;
      border-radius: 4px;
      word-break: break-all;
      font-family: monospace;
      font-size: 12px;
      margin: 15px 0;
      color: #374151;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">${escapeHtml(APP_NAME)}</div>
    </div>

    <h1>Reset Your Password</h1>

    <div class="content">
      <p>Hello ${escapeHtml(username)},</p>
      <p>We received a request to reset your password for your ${escapeHtml(APP_NAME)} account. Click the button below to set a new password:</p>

      <center>
        <a href="${escapeHtml(resetUrl)}" class="cta-button">Reset Password</a>
      </center>

      <p style="margin-top: 30px;">If the button doesn't work, you can also copy and paste this link in your browser:</p>
      <div class="reset-url">${escapeHtml(resetUrl)}</div>

      <div class="warning">
        <strong>Security Note:</strong> This password reset link is valid for 1 hour. After that, you'll need to request a new reset.
      </div>

      <p style="margin-top: 30px;">If you didn't request a password reset, you can ignore this email. Your account is still secure.</p>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} ${escapeHtml(APP_NAME)}. All rights reserved.</p>
      <p>This is an automated email, please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate the plain text template for password reset email
 * All user inputs are escaped to prevent email injection attacks
 */
function generateResetEmailPlainText(resetUrl: string, username: string): string {
  return `
Reset Your Password

Hello ${escapeText(username)},

We received a request to reset your password for your ${escapeText(APP_NAME)} account. Visit the link below to set a new password:

${escapeText(resetUrl)}

Security Note:
This password reset link is valid for 1 hour. After that, you'll need to request a new reset.

If you didn't request a password reset, you can ignore this email. Your account is still secure.

© ${new Date().getFullYear()} ${escapeText(APP_NAME)}. All rights reserved.
This is an automated email, please do not reply.
  `.trim();
}

/**
 * Send a password reset email to the user
 * Uses Resend email service
 */
export async function sendPasswordResetEmail({
  email,
  resetUrl,
  username,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: `${APP_NAME} - Reset Your Password`,
      html: generateResetEmailTemplate(resetUrl, username),
      text: generateResetEmailPlainText(resetUrl, username),
    });

    if (response.error) {
      console.error('Error sending password reset email:', response.error);
      return { success: false, error: response.error.message };
    }

    return { success: true, messageId: response.data?.id };
  } catch (error) {
    console.error('Unexpected error sending password reset email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Generate the HTML template for registration confirmation email
 * All user inputs are escaped to prevent email injection attacks
 */
function generateRegistrationEmailTemplate(username: string, firstName: string): string {
  const loginUrl = `${APP_URL}/login`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 30px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
    }
    h1 {
      font-size: 20px;
      margin: 0 0 20px 0;
      color: #1f2937;
    }
    .content {
      margin-bottom: 30px;
      color: #4b5563;
    }
    .cta-button {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .cta-button:hover {
      background-color: #1d4ed8;
    }
    .info-box {
      background-color: #f3f4f6;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .info-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .info-value {
      font-weight: 500;
      color: #1f2937;
    }
    .footer {
      border-top: 1px solid #e0e0e0;
      padding-top: 20px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">${escapeHtml(APP_NAME)}</div>
    </div>

    <h1>Welcome to ${escapeHtml(APP_NAME)}!</h1>

    <div class="content">
      <p>Hello ${escapeHtml(firstName)},</p>
      <p>Your account has been created successfully. You can now start making predictions and compete with your friends!</p>

      <div class="info-box">
        <div class="info-label">Your Username</div>
        <div class="info-value">${escapeHtml(username)}</div>
      </div>

      <center>
        <a href="${escapeHtml(loginUrl)}" class="cta-button">Sign In</a>
      </center>

      <p style="margin-top: 30px;">Happy betting!</p>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} ${escapeHtml(APP_NAME)}. All rights reserved.</p>
      <p>This is an automated email, please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate the plain text template for registration confirmation email
 * All user inputs are escaped to prevent email injection attacks
 */
function generateRegistrationEmailPlainText(username: string, firstName: string): string {
  const loginUrl = `${APP_URL}/login`;

  return `
Welcome to ${escapeText(APP_NAME)}!

Hello ${escapeText(firstName)},

Your account has been created successfully. You can now start making predictions and compete with your friends!

Your Username: ${escapeText(username)}

Sign in at: ${escapeText(loginUrl)}

Happy betting!

© ${new Date().getFullYear()} ${escapeText(APP_NAME)}. All rights reserved.
This is an automated email, please do not reply.
  `.trim();
}

/**
 * Send a registration confirmation email to the user
 * Uses Resend email service
 */
export async function sendRegistrationConfirmationEmail({
  email,
  username,
  firstName,
}: SendRegistrationConfirmationParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: `Welcome to ${APP_NAME}!`,
      html: generateRegistrationEmailTemplate(username, firstName),
      text: generateRegistrationEmailPlainText(username, firstName),
    });

    if (response.error) {
      console.error('Error sending registration confirmation email:', response.error);
      return { success: false, error: response.error.message };
    }

    return { success: true, messageId: response.data?.id };
  } catch (error) {
    console.error('Unexpected error sending registration confirmation email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
