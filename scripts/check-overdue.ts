import { PrismaClient } from "@prisma/client";
import { startOfDay, subDays, differenceInDays, format } from "date-fns";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

const APP_NAME = process.env.APP_NAME || "DRMS";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

function wrapTemplate(content: string): string {
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
          <h1 style="color:#ffffff;margin:0;font-size:24px;">${APP_NAME}</h1>
          <p style="color:#AED6F1;margin:4px 0 0;font-size:14px;">Document Request Management System</p>
        </div>
        <div style="padding:30px;">
          ${content}
        </div>
        <div style="background-color:#f8f9fa;padding:20px 30px;text-align:center;font-size:12px;color:#6c757d;">
          <p style="margin:0;">This is an automated message from ${APP_NAME} DRMS.</p>
          <p style="margin:4px 0 0;">Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendCronEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return false;
    }
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `${APP_NAME} <noreply@company.com>`,
      to,
      subject: `[${APP_NAME}] ${subject}`,
      html: wrapTemplate(html),
    });
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
}

async function checkOverdue() {
  console.log(`[${new Date().toISOString()}] Running overdue check...`);

  const today = startOfDay(new Date());

  // 1. Mark overdue assignments
  const overdueAssignments = await prisma.requestAssignment.findMany({
    where: {
      status: "PENDING",
      dueDate: { lt: today },
    },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      request: { select: { id: true, title: true, deadline: true } },
    },
  });

  if (overdueAssignments.length > 0) {
    await prisma.requestAssignment.updateMany({
      where: {
        id: { in: overdueAssignments.map((a) => a.id) },
      },
      data: { status: "OVERDUE" },
    });

    console.log(`Marked ${overdueAssignments.length} assignments as OVERDUE`);

    // Create notifications for affected employees
    await prisma.notification.createMany({
      data: overdueAssignments.map((a) => ({
        userId: a.employee.id,
        type: "OVERDUE" as const,
        title: "Document Request Overdue",
        message: `"${a.request.title}" is now overdue. Please submit as soon as possible.`,
        link: `/employee/requests/${a.request.id}`,
      })),
    });

    // Send overdue emails to affected employees
    let overdueEmailsSent = 0;
    for (const a of overdueAssignments) {
      const deadlineStr = a.request.deadline
        ? format(a.request.deadline, "MMM dd, yyyy")
        : "N/A";
      const html = `
        <h2 style="color:#E74C3C;margin-top:0;">Document Request Overdue</h2>
        <p>Hello ${a.employee.name},</p>
        <p>The following document request is now <strong style="color:#E74C3C;">overdue</strong>:</p>
        <div style="background-color:#fdedec;border-left:4px solid #E74C3C;padding:15px;margin:20px 0;">
          <p style="margin:0;font-weight:bold;font-size:16px;">${a.request.title}</p>
          <p style="margin:8px 0 0;color:#E74C3C;font-weight:bold;">Was due: ${deadlineStr}</p>
        </div>
        <p>Please submit the required documents as soon as possible.</p>
        <a href="${APP_URL}/employee/requests/${a.request.id}" style="display:inline-block;background-color:#E74C3C;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;margin:10px 0;">Upload Now</a>
      `;
      const sent = await sendCronEmail(a.employee.email, `OVERDUE: ${a.request.title}`, html);
      if (sent) overdueEmailsSent++;
    }
    console.log(`Sent ${overdueEmailsSent}/${overdueAssignments.length} overdue emails`);

    // Notify HR users
    const hrUsers = await prisma.user.findMany({
      where: { role: { in: ["HR", "ADMIN"] }, isActive: true },
      select: { id: true },
    });

    if (hrUsers.length > 0) {
      await prisma.notification.createMany({
        data: hrUsers.map((hr) => ({
          userId: hr.id,
          type: "OVERDUE" as const,
          title: "New Overdue Submissions",
          message: `${overdueAssignments.length} assignment(s) became overdue today.`,
          link: "/hr/requests?status=OVERDUE",
        })),
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: "OVERDUE_CHECK",
        entityType: "system",
        details: {
          overdueCount: overdueAssignments.length,
          assignments: overdueAssignments.map((a) => ({
            id: a.id,
            employee: a.employee.name,
            request: a.request.title,
          })),
        },
      },
    });
  } else {
    console.log("No new overdue assignments found");
  }

  // 2. Send deadline approaching reminders
  const settingRow = await prisma.systemSetting.findUnique({
    where: { key: "reminder_days_before" },
  });
  const reminderDays = (settingRow?.value || "3,1")
    .split(",")
    .map((d) => parseInt(d.trim()))
    .filter((d) => !isNaN(d));

  for (const days of reminderDays) {
    const targetDate = startOfDay(new Date());
    targetDate.setDate(targetDate.getDate() + days);

    const upcomingAssignments = await prisma.requestAssignment.findMany({
      where: {
        status: "PENDING",
        dueDate: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        request: { select: { id: true, title: true, deadline: true } },
      },
    });

    if (upcomingAssignments.length > 0) {
      console.log(
        `Sending ${days}-day reminders to ${upcomingAssignments.length} employees`
      );

      await prisma.notification.createMany({
        data: upcomingAssignments.map((a) => ({
          userId: a.employee.id,
          type: "DEADLINE_APPROACHING" as const,
          title: "Deadline Approaching",
          message: `"${a.request.title}" is due in ${days} day(s).`,
          link: `/employee/requests/${a.request.id}`,
        })),
      });

      // Send deadline-approaching emails
      let approachingEmailsSent = 0;
      for (const a of upcomingAssignments) {
        const deadlineStr = a.request.deadline
          ? format(a.request.deadline, "MMM dd, yyyy")
          : "N/A";
        const html = `
          <h2 style="color:#F39C12;margin-top:0;">Deadline Approaching</h2>
          <p>Hello ${a.employee.name},</p>
          <p>This is a reminder that the following document request is due in <strong>${days} day${days !== 1 ? "s" : ""}</strong>:</p>
          <div style="background-color:#fef9e7;border-left:4px solid #F39C12;padding:15px;margin:20px 0;">
            <p style="margin:0;font-weight:bold;font-size:16px;">${a.request.title}</p>
            <p style="margin:8px 0 0;color:#E74C3C;font-weight:bold;">Deadline: ${deadlineStr}</p>
          </div>
          <p>Please submit the required documents before the deadline.</p>
          <a href="${APP_URL}/employee/requests/${a.request.id}" style="display:inline-block;background-color:#F39C12;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;margin:10px 0;">Upload Documents</a>
        `;
        const sent = await sendCronEmail(
          a.employee.email,
          `Reminder: ${a.request.title} - Due in ${days} days`,
          html
        );
        if (sent) approachingEmailsSent++;
      }
      console.log(`Sent ${approachingEmailsSent}/${upcomingAssignments.length} deadline-approaching emails`);
    }
  }

  console.log(`[${new Date().toISOString()}] Overdue check complete`);
}

checkOverdue()
  .catch((e) => {
    console.error("Overdue check failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
