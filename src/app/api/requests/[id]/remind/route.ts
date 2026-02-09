import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isNextResponse } from "@/lib/auth-guard";
import { notifyReminder } from "@/lib/notifications";
import { createAuditLog, getClientIp } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "HR"]);
    if (isNextResponse(user)) return user;

    const docRequest = await prisma.documentRequest.findUnique({
      where: { id: params.id },
      include: {
        assignments: {
          where: { status: { in: ["PENDING", "OVERDUE"] } },
          include: {
            employee: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!docRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    const pendingAssignments = docRequest.assignments;

    if (pendingAssignments.length === 0) {
      return NextResponse.json(
        { success: false, error: "No pending or overdue assignments to remind" },
        { status: 400 }
      );
    }

    for (const assignment of pendingAssignments) {
      await notifyReminder(
        assignment.employee.id,
        assignment.employee.name,
        assignment.employee.email,
        docRequest.title,
        docRequest.deadline,
        docRequest.id
      );

      await prisma.requestAssignment.update({
        where: { id: assignment.id },
        data: {
          reminderCount: { increment: 1 },
          lastReminderAt: new Date(),
        },
      });
    }

    await createAuditLog({
      userId: user.id,
      action: "SEND_REMINDER",
      entityType: "request",
      entityId: params.id,
      details: { remindersSent: pendingAssignments.length },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: `Reminders sent to ${pendingAssignments.length} employee(s)`,
    });
  } catch (error) {
    console.error("POST /api/requests/[id]/remind error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}
