import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isNextResponse } from "@/lib/auth-guard";
import { canSendReminders, getAccessibleDepartments } from "@/lib/permissions";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { createBulkNotifications } from "@/lib/notifications";
import { sendBulkReminderEmail } from "@/lib/email";
import { format } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    if (!canSendReminders(user)) {
      return NextResponse.json(
        { success: false, error: "Not authorized to send reminders" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      requestId,
      departmentFilter,
      employeeIds,
      statusFilter,
    } = body as {
      requestId?: string;
      departmentFilter?: string;
      employeeIds?: string[];
      statusFilter?: "PENDING" | "OVERDUE";
    };

    // Build query for assignments
    const where: Record<string, unknown> = {};

    if (requestId) {
      where.requestId = requestId;
    }

    if (statusFilter) {
      where.status = statusFilter;
    } else {
      where.status = { in: ["PENDING", "OVERDUE"] };
    }

    // Only open requests (HR can only send reminders for their own requests)
    const requestFilter: Record<string, unknown> = { status: "OPEN" };
    if (user.role === "HR") {
      requestFilter.createdById = user.id;
    }
    where.request = requestFilter;

    // Department filter with permission check
    const accessibleDepts = getAccessibleDepartments(user);
    if (departmentFilter) {
      if (accessibleDepts !== "ALL" && !accessibleDepts.includes(departmentFilter)) {
        return NextResponse.json(
          { success: false, error: "Not authorized for this department" },
          { status: 403 }
        );
      }
      where.employee = { department: departmentFilter, isActive: true };
    } else if (accessibleDepts !== "ALL") {
      where.employee = { department: { in: accessibleDepts }, isActive: true };
    } else {
      where.employee = { isActive: true };
    }

    if (employeeIds && employeeIds.length > 0) {
      where.employeeId = { in: employeeIds };
    }

    const assignments = await prisma.requestAssignment.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, email: true } },
        request: {
          select: {
            id: true,
            title: true,
            description: true,
            deadline: true,
            templateUrl: true,
          },
        },
      },
    });

    if (assignments.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        message: "No matching assignments found",
      });
    }

    // Group by request for bulk email
    const byRequest = new Map<
      string,
      {
        request: (typeof assignments)[0]["request"];
        employees: { email: string; name: string; assignmentId: string }[];
      }
    >();

    for (const a of assignments) {
      const existing = byRequest.get(a.request.id);
      if (existing) {
        existing.employees.push({
          email: a.employee.email,
          name: a.employee.name,
          assignmentId: a.id,
        });
      } else {
        byRequest.set(a.request.id, {
          request: a.request,
          employees: [
            {
              email: a.employee.email,
              name: a.employee.name,
              assignmentId: a.id,
            },
          ],
        });
      }
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (const [, { request: req, employees }] of byRequest) {
      const deadlineStr = req.deadline
        ? format(req.deadline, "MMM dd, yyyy")
        : null;

      const result = await sendBulkReminderEmail(
        employees,
        req.title,
        req.description.substring(0, 200),
        deadlineStr,
        req.id,
        !!req.templateUrl
      );

      totalSent += result.sent;
      totalFailed += result.failed;

      // Update reminder counts
      const assignmentIds = employees.map((e) => e.assignmentId);
      await prisma.requestAssignment.updateMany({
        where: { id: { in: assignmentIds } },
        data: {
          reminderCount: { increment: 1 },
          lastReminderAt: new Date(),
        },
      });

      // Create notifications
      const notifData = assignments
        .filter((a) => a.request.id === req.id)
        .map((a) => ({
          userId: a.employee.id,
          type: "REMINDER" as const,
          title: "Reminder: Document Request",
          message: `You have been sent a reminder to submit "${req.title}"`,
          link: `/employee/requests/${req.id}`,
        }));

      await createBulkNotifications(notifData);
    }

    await createAuditLog({
      userId: user.id,
      action: "BULK_REMINDER",
      entityType: "tracking",
      details: {
        totalSent,
        totalFailed,
        requestId: requestId || "multiple",
        departmentFilter,
        assignmentCount: assignments.length,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      sent: totalSent,
      failed: totalFailed,
      total: assignments.length,
    });
  } catch (error) {
    console.error("POST /api/tracking/send-reminders error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}
