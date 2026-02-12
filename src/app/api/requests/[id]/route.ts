import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isNextResponse } from "@/lib/auth-guard";
import { canAccessRequest } from "@/lib/permissions";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { z } from "zod";

const documentSlotSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  templateId: z.string().nullable().optional(),
});

const updateRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["OPEN", "PENDING_HR", "CLOSED", "CANCELLED"]).optional(),
  assignedToId: z.string().nullable().optional(),
  acceptedFormats: z.string().optional(),
  maxFileSizeMb: z.number().min(1).max(100).optional(),
  notes: z.string().optional(),
  documentSlots: z.array(documentSlotSchema).min(1).max(5).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (isNextResponse(user)) return user;
    const docRequest = await prisma.documentRequest.findUnique({
      where: { id },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        documentSlots: { orderBy: { sortOrder: "asc" } },
        attachments: true,
        assignments: {
          include: {
            employee: {
              select: { id: true, name: true, email: true, department: true },
            },
            reviewedBy: { select: { id: true, name: true } },
            documents: {
              where: { isLatest: true },
              select: {
                id: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                note: true,
                version: true,
                createdAt: true,
              },
            },
          },
          orderBy: { employee: { name: "asc" } },
        },
      },
    });
    if (!docRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    // Unified access check: creator, HR processor, employee target, or ADMIN
    const employeeTargetIds = docRequest.assignments.map((a) => a.employee.id);
    const hasAccess = canAccessRequest(user, {
      createdById: docRequest.createdById,
      assignedToId: docRequest.assignedToId,
      employeeTargetIds,
    });

    // DEPARTMENT_HEAD can also access if they have employees in their department
    const deptHeadAccess =
      user.role === "DEPARTMENT_HEAD" &&
      docRequest.assignments.some(
        (a) => a.employee.department === user.managedDepartment
      );

    if (!hasAccess && !deptHeadAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // DEPARTMENT_HEAD: filter assignments to their department only (unless creator)
    if (user.role === "DEPARTMENT_HEAD" && docRequest.createdById !== user.id) {
      docRequest.assignments = docRequest.assignments.filter(
        (a) => a.employee.department === user.managedDepartment
      );
    }

    return NextResponse.json({ success: true, data: docRequest });
  } catch (error) {
    console.error("GET /api/requests/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch request" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole(["ADMIN", "HR", "DEPARTMENT_HEAD"]);
    if (isNextResponse(user)) return user;

    const body = await request.json();
    const parsed = updateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.documentRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    // HR can update requests they created or are assigned to, but cannot reassign
    if (user.role === "HR") {
      if (existing.createdById !== user.id && existing.assignedToId !== user.id) {
        return NextResponse.json(
          { success: false, error: "You can only update your own requests" },
          { status: 403 }
        );
      }
      if (parsed.data.assignedToId !== undefined) {
        return NextResponse.json(
          { success: false, error: "HR users cannot reassign requests" },
          { status: 403 }
        );
      }
    }

    // DEPARTMENT_HEAD can only update their own requests
    if (user.role === "DEPARTMENT_HEAD" && existing.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only update your own requests" },
        { status: 403 }
      );
    }

    // Validate assignedToId change
    if (parsed.data.assignedToId !== undefined && parsed.data.assignedToId !== null) {
      const targetUser = await prisma.user.findUnique({
        where: { id: parsed.data.assignedToId },
        select: { role: true, isActive: true },
      });
      if (!targetUser || targetUser.role !== "HR" || !targetUser.isActive) {
        return NextResponse.json(
          { success: false, error: "Invalid HR user for assignment" },
          { status: 400 }
        );
      }
    }

    const { documentSlots, ...restData } = parsed.data;
    const updateData: Record<string, unknown> = { ...restData };
    if (restData.deadline) {
      updateData.deadline = new Date(restData.deadline);
    }

    const updated = await prisma.documentRequest.update({
      where: { id },
      data: updateData,
    });

    // Update document slots if provided (replace all)
    if (documentSlots) {
      await prisma.documentSlot.deleteMany({ where: { requestId: id } });
      if (documentSlots.length > 0) {
        await prisma.documentSlot.createMany({
          data: documentSlots.map((slot, index) => ({
            requestId: id,
            name: slot.name,
            templateId: slot.templateId || null,
            sortOrder: index,
          })),
        });
      }
    }

    // If deadline changed, update all assignment due dates
    if (parsed.data.deadline) {
      await prisma.requestAssignment.updateMany({
        where: { requestId: id },
        data: { dueDate: new Date(parsed.data.deadline) },
      });
    }

    // If request cancelled, notify employees
    if (parsed.data.status === "CANCELLED") {
      const assignments = await prisma.requestAssignment.findMany({
        where: { requestId: id },
        select: { employeeId: true },
      });

      await prisma.notification.createMany({
        data: assignments.map((a) => ({
          userId: a.employeeId,
          type: "REQUEST_CANCELLED" as const,
          title: "Request Cancelled",
          message: `The document request "${updated.title}" has been cancelled.`,
          link: null,
        })),
      });
    }

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_REQUEST",
      entityType: "request",
      entityId: id,
      details: parsed.data,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/requests/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update request" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole(["ADMIN"]);
    if (isNextResponse(user)) return user;

    const existing = await prisma.documentRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    await prisma.documentRequest.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE_REQUEST",
      entityType: "request",
      entityId: id,
      details: { title: existing.title },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, message: "Request deleted" });
  } catch (error) {
    console.error("DELETE /api/requests/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete request" },
      { status: 500 }
    );
  }
}


