import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isNextResponse } from "@/lib/auth-guard";
import { notifyApproved, notifyRejected } from "@/lib/notifications";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { z } from "zod";

const reviewSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "HR"]);
    if (isNextResponse(user)) return user;

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    if (parsed.data.action === "REJECTED" && !parsed.data.note) {
      return NextResponse.json(
        { success: false, error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const assignment = await prisma.requestAssignment.findUnique({
      where: { id: params.id },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        request: { select: { id: true, title: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    if (assignment.status !== "SUBMITTED") {
      return NextResponse.json(
        { success: false, error: "Can only review submitted assignments" },
        { status: 400 }
      );
    }

    const updated = await prisma.requestAssignment.update({
      where: { id: params.id },
      data: {
        status: parsed.data.action,
        reviewedById: user.id,
        reviewNote: parsed.data.note || null,
        reviewedAt: new Date(),
      },
    });

    // If rejected, reset document so employee can re-upload
    if (parsed.data.action === "REJECTED") {
      notifyRejected(
        assignment.employee.id,
        assignment.employee.name,
        assignment.employee.email,
        assignment.request.title,
        parsed.data.note!,
        assignment.request.id
      ).catch((err) => console.error("Notification failed:", err));
    } else {
      notifyApproved(
        assignment.employee.id,
        assignment.employee.name,
        assignment.employee.email,
        assignment.request.title,
        assignment.request.id
      ).catch((err) => console.error("Notification failed:", err));
    }

    await createAuditLog({
      userId: user.id,
      action: parsed.data.action === "APPROVED" ? "APPROVE_DOCUMENT" : "REJECT_DOCUMENT",
      entityType: "assignment",
      entityId: params.id,
      details: {
        requestTitle: assignment.request.title,
        employeeName: assignment.employee.name,
        note: parsed.data.note,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/assignments/[id]/review error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to review assignment" },
      { status: 500 }
    );
  }
}
