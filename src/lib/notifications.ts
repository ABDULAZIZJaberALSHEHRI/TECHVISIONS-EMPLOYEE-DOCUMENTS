import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";
import {
  sendNewRequestEmail,
  sendDeadlineApproachingEmail,
  sendOverdueEmail,
  sendApprovedEmail,
  sendRejectedEmail,
  sendReminderEmail,
} from "@/lib/email";
import { format } from "date-fns";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

export async function createBulkNotifications(
  notifications: CreateNotificationParams[]
): Promise<void> {
  try {
    await prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link || null,
      })),
    });
  } catch (error) {
    console.error("Failed to create bulk notifications:", error);
  }
}

export async function notifyNewRequest(
  employeeId: string,
  employeeName: string,
  employeeEmail: string,
  requestTitle: string,
  deadline: Date,
  requestId: string
): Promise<void> {
  const deadlineStr = format(deadline, "MMM dd, yyyy");

  await createNotification({
    userId: employeeId,
    type: "NEW_REQUEST",
    title: "New Document Request",
    message: `You have been assigned a new document request: "${requestTitle}". Deadline: ${deadlineStr}`,
    link: `/employee/requests/${requestId}`,
  });

  // Send email asynchronously
  sendNewRequestEmail(
    employeeEmail,
    employeeName,
    requestTitle,
    deadlineStr,
    requestId
  ).catch((err) => console.error("Email send failed:", err));
}

export async function notifyDeadlineApproaching(
  employeeId: string,
  employeeName: string,
  employeeEmail: string,
  requestTitle: string,
  deadline: Date,
  daysLeft: number,
  requestId: string
): Promise<void> {
  const deadlineStr = format(deadline, "MMM dd, yyyy");

  await createNotification({
    userId: employeeId,
    type: "DEADLINE_APPROACHING",
    title: "Deadline Approaching",
    message: `"${requestTitle}" is due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} (${deadlineStr})`,
    link: `/employee/requests/${requestId}`,
  });

  sendDeadlineApproachingEmail(
    employeeEmail,
    employeeName,
    requestTitle,
    deadlineStr,
    daysLeft,
    requestId
  ).catch((err) => console.error("Email send failed:", err));
}

export async function notifyOverdue(
  employeeId: string,
  employeeName: string,
  employeeEmail: string,
  requestTitle: string,
  deadline: Date,
  requestId: string
): Promise<void> {
  const deadlineStr = format(deadline, "MMM dd, yyyy");

  await createNotification({
    userId: employeeId,
    type: "OVERDUE",
    title: "Document Request Overdue",
    message: `"${requestTitle}" was due on ${deadlineStr} and is now overdue.`,
    link: `/employee/requests/${requestId}`,
  });

  sendOverdueEmail(
    employeeEmail,
    employeeName,
    requestTitle,
    deadlineStr,
    requestId
  ).catch((err) => console.error("Email send failed:", err));
}

export async function notifyApproved(
  employeeId: string,
  employeeName: string,
  employeeEmail: string,
  requestTitle: string,
  requestId: string
): Promise<void> {
  await createNotification({
    userId: employeeId,
    type: "APPROVED",
    title: "Document Approved",
    message: `Your submission for "${requestTitle}" has been approved.`,
    link: `/employee/requests/${requestId}`,
  });

  sendApprovedEmail(
    employeeEmail,
    employeeName,
    requestTitle,
    requestId
  ).catch((err) => console.error("Email send failed:", err));
}

export async function notifyRejected(
  employeeId: string,
  employeeName: string,
  employeeEmail: string,
  requestTitle: string,
  reason: string,
  requestId: string
): Promise<void> {
  await createNotification({
    userId: employeeId,
    type: "REJECTED",
    title: "Document Rejected",
    message: `Your submission for "${requestTitle}" has been rejected. Reason: ${reason}`,
    link: `/employee/requests/${requestId}`,
  });

  sendRejectedEmail(
    employeeEmail,
    employeeName,
    requestTitle,
    reason,
    requestId
  ).catch((err) => console.error("Email send failed:", err));
}

export async function notifyReminder(
  employeeId: string,
  employeeName: string,
  employeeEmail: string,
  requestTitle: string,
  deadline: Date,
  requestId: string
): Promise<void> {
  const deadlineStr = format(deadline, "MMM dd, yyyy");

  await createNotification({
    userId: employeeId,
    type: "REMINDER",
    title: "Reminder from HR",
    message: `HR has sent you a reminder to submit "${requestTitle}". Deadline: ${deadlineStr}`,
    link: `/employee/requests/${requestId}`,
  });

  sendReminderEmail(
    employeeEmail,
    employeeName,
    requestTitle,
    deadlineStr,
    requestId
  ).catch((err) => console.error("Email send failed:", err));
}

export async function notifyHROverdue(
  hrUserIds: string[],
  overdueCount: number
): Promise<void> {
  await createBulkNotifications(
    hrUserIds.map((userId) => ({
      userId,
      type: "OVERDUE" as NotificationType,
      title: "New Overdue Submissions",
      message: `${overdueCount} assignment${overdueCount !== 1 ? "s" : ""} became overdue today.`,
      link: "/hr/requests?status=OVERDUE",
    }))
  );
}
