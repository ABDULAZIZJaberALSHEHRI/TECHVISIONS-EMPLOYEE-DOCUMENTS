import nodemailer from "nodemailer";
import { APP_NAME, APP_URL } from "@/lib/constants";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.office365.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
});

function getBaseTemplate(content: string): string {
  const companyName = APP_NAME;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f5f5f5;">
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
        <div style="background-color:#3B82F6;padding:20px 30px;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;">${companyName}</h1>
          <p style="color:#AED6F1;margin:4px 0 0;font-size:14px;">Document Request Management System</p>
        </div>
        <div style="padding:30px;">
          ${content}
        </div>
        <div style="background-color:#f8f9fa;padding:20px 30px;text-align:center;font-size:12px;color:#6c757d;">
          <p style="margin:0;">This is an automated message from ${companyName} DRMS.</p>
          <p style="margin:4px 0 0;">Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP not configured, skipping email send");
      return false;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `${APP_NAME} <noreply@company.com>`,
      to,
      subject: `[${APP_NAME}] ${subject}`,
      html: getBaseTemplate(html),
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export async function sendNewRequestEmail(
  to: string,
  employeeName: string,
  requestTitle: string,
  deadline: string,
  requestId: string
): Promise<boolean> {
  const html = `
    <h2 style="color:#3B82F6;margin-top:0;">New Document Request</h2>
    <p>Hello ${employeeName},</p>
    <p>A new document request has been assigned to you:</p>
    <div style="background-color:#f8f9fa;border-left:4px solid #2E86C1;padding:15px;margin:20px 0;">
      <p style="margin:0;font-weight:bold;font-size:16px;">${requestTitle}</p>
      <p style="margin:8px 0 0;color:#E74C3C;font-weight:bold;">Deadline: ${deadline}</p>
    </div>
    <p>Please log in to the system to view the full details and upload the required documents.</p>
    <a href="${APP_URL}/employee/requests/${requestId}" style="display:inline-block;background-color:#2E86C1;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;margin:10px 0;">View Request</a>
  `;
  return sendEmail(to, `New Request: ${requestTitle}`, html);
}

export async function sendDeadlineApproachingEmail(
  to: string,
  employeeName: string,
  requestTitle: string,
  deadline: string,
  daysLeft: number,
  requestId: string
): Promise<boolean> {
  const html = `
    <h2 style="color:#F39C12;margin-top:0;">Deadline Approaching</h2>
    <p>Hello ${employeeName},</p>
    <p>This is a reminder that the following document request is due in <strong>${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>:</p>
    <div style="background-color:#fef9e7;border-left:4px solid #F39C12;padding:15px;margin:20px 0;">
      <p style="margin:0;font-weight:bold;font-size:16px;">${requestTitle}</p>
      <p style="margin:8px 0 0;color:#E74C3C;font-weight:bold;">Deadline: ${deadline}</p>
    </div>
    <p>Please submit the required documents before the deadline.</p>
    <a href="${APP_URL}/employee/requests/${requestId}" style="display:inline-block;background-color:#F39C12;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;margin:10px 0;">Upload Documents</a>
  `;
  return sendEmail(to, `Reminder: ${requestTitle} - Due in ${daysLeft} days`, html);
}

export async function sendOverdueEmail(
  to: string,
  employeeName: string,
  requestTitle: string,
  deadline: string,
  requestId: string
): Promise<boolean> {
  const html = `
    <h2 style="color:#E74C3C;margin-top:0;">Document Request Overdue</h2>
    <p>Hello ${employeeName},</p>
    <p>The following document request is now <strong style="color:#E74C3C;">overdue</strong>:</p>
    <div style="background-color:#fdedec;border-left:4px solid #E74C3C;padding:15px;margin:20px 0;">
      <p style="margin:0;font-weight:bold;font-size:16px;">${requestTitle}</p>
      <p style="margin:8px 0 0;color:#E74C3C;font-weight:bold;">Was due: ${deadline}</p>
    </div>
    <p>Please submit the required documents as soon as possible.</p>
    <a href="${APP_URL}/employee/requests/${requestId}" style="display:inline-block;background-color:#E74C3C;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;margin:10px 0;">Upload Now</a>
  `;
  return sendEmail(to, `OVERDUE: ${requestTitle}`, html);
}

export async function sendApprovedEmail(
  to: string,
  employeeName: string,
  requestTitle: string,
  requestId: string
): Promise<boolean> {
  const html = `
    <h2 style="color:#27AE60;margin-top:0;">Document Approved</h2>
    <p>Hello ${employeeName},</p>
    <p>Your submitted document for the following request has been <strong style="color:#27AE60;">approved</strong>:</p>
    <div style="background-color:#eafaf1;border-left:4px solid #27AE60;padding:15px;margin:20px 0;">
      <p style="margin:0;font-weight:bold;font-size:16px;">${requestTitle}</p>
    </div>
    <p>No further action is required for this request.</p>
    <a href="${APP_URL}/employee/requests/${requestId}" style="display:inline-block;background-color:#27AE60;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;margin:10px 0;">View Details</a>
  `;
  return sendEmail(to, `Approved: ${requestTitle}`, html);
}

export async function sendRejectedEmail(
  to: string,
  employeeName: string,
  requestTitle: string,
  reason: string,
  requestId: string
): Promise<boolean> {
  const html = `
    <h2 style="color:#E74C3C;margin-top:0;">Document Rejected</h2>
    <p>Hello ${employeeName},</p>
    <p>Your submitted document for the following request has been <strong style="color:#E74C3C;">rejected</strong>:</p>
    <div style="background-color:#fdedec;border-left:4px solid #E74C3C;padding:15px;margin:20px 0;">
      <p style="margin:0;font-weight:bold;font-size:16px;">${requestTitle}</p>
      <p style="margin:12px 0 0;"><strong>Reason:</strong></p>
      <p style="margin:4px 0 0;color:#555;">${reason}</p>
    </div>
    <p>Please review the feedback and re-upload the document.</p>
    <a href="${APP_URL}/employee/requests/${requestId}" style="display:inline-block;background-color:#2E86C1;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;margin:10px 0;">Re-upload Document</a>
  `;
  return sendEmail(to, `Rejected: ${requestTitle} - Action Required`, html);
}

export async function sendReminderEmail(
  to: string,
  employeeName: string,
  requestTitle: string,
  deadline: string,
  requestId: string
): Promise<boolean> {
  const html = `
    <h2 style="color:#2E86C1;margin-top:0;">Reminder: Document Request</h2>
    <p>Hello ${employeeName},</p>
    <p>This is a reminder from HR to submit the following document request:</p>
    <div style="background-color:#ebf5fb;border-left:4px solid #2E86C1;padding:15px;margin:20px 0;">
      <p style="margin:0;font-weight:bold;font-size:16px;">${requestTitle}</p>
      <p style="margin:8px 0 0;color:#E74C3C;font-weight:bold;">Deadline: ${deadline}</p>
    </div>
    <p>Please upload the required documents at your earliest convenience.</p>
    <a href="${APP_URL}/employee/requests/${requestId}" style="display:inline-block;background-color:#2E86C1;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;margin:10px 0;">Upload Documents</a>
  `;
  return sendEmail(to, `Reminder: ${requestTitle}`, html);
}

export async function sendBulkReminderEmail(
  employees: { email: string; name: string }[],
  requestTitle: string,
  requestDescription: string,
  deadline: string | null,
  requestId: string,
  hasTemplate: boolean
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const emp of employees) {
    const templateSection = hasTemplate
      ? `<p style="margin:12px 0;"><strong>A template is available.</strong> Log in to download it before submitting.</p>`
      : "";

    const deadlineSection = deadline
      ? `<p style="margin:8px 0 0;color:#E74C3C;font-weight:bold;">Deadline: ${deadline}</p>`
      : "";

    const html = `
      <h2 style="color:#F39C12;margin-top:0;">Action Required: Document Request</h2>
      <p>Hello ${emp.name},</p>
      <p>This is a reminder that the following document request requires your attention:</p>
      <div style="background-color:#fef9e7;border-left:4px solid #F39C12;padding:15px;margin:20px 0;">
        <p style="margin:0;font-weight:bold;font-size:16px;">${requestTitle}</p>
        <p style="margin:8px 0 0;color:#555;font-size:14px;">${requestDescription}</p>
        ${deadlineSection}
      </div>
      ${templateSection}
      <p>Please submit the required documents as soon as possible.</p>
      <a href="${APP_URL}/employee/requests/${requestId}" style="display:inline-block;background-color:#F39C12;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;margin:10px 0;">Upload Documents</a>
      <p style="margin-top:20px;font-size:13px;color:#888;">If you have already submitted, please disregard this message.</p>
    `;

    const success = await sendEmail(
      emp.email,
      `Reminder: ${requestTitle}`,
      html
    );
    if (success) sent++;
    else failed++;
  }

  return { sent, failed };
}
