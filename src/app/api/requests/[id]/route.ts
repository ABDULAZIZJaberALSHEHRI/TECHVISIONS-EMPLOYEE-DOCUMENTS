import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isNextResponse } from "@/lib/auth-guard";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { z } from "zod";

const updateRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["OPEN", "CLOSED", "CANCELLED"]).optional(),
  acceptedFormats: z.string().optional(),
  maxFileSizeMb: z.number().min(1).max(100).optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    const docRequest = await prisma.documentRequest.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, email: true } },
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

    // DEPARTMENT_HEAD can only see their department's assignments
    if (user.role === "DEPARTMENT_HEAD") {
      docRequest.assignments = docRequest.assignments.filter(
        (a) => a.employee.department === user.managedDepartment || docRequest.createdById === user.id
      );
    }

    // Employee can only see their own assignment
    if (user.role === "EMPLOYEE") {
      const hasAssignment = docRequest.assignments.some(
        (a) => a.employeeId === user.id
      );
      if (!hasAssignment) {
        return NextResponse.json(
          { success: false, error: "Access denied" },
          { status: 403 }
        );
      }
      docRequest.assignments = docRequest.assignments.filter(
        (a) => a.employeeId === user.id
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "HR", "DEPARTMENT_HEAD"]);
    if (isNextResponse(user)) return user;

    const body = await request.json();
    const parsed = updateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.documentRequest.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    // DEPARTMENT_HEAD can only update their own requests
    if (user.role === "DEPARTMENT_HEAD" && existing.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only update your own requests" },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.deadline) {
      updateData.deadline = new Date(parsed.data.deadline);
    }

    const updated = await prisma.documentRequest.update({
      where: { id: params.id },
      data: updateData,
    });

    // If deadline changed, update all assignment due dates
    if (parsed.data.deadline) {
      await prisma.requestAssignment.updateMany({
        where: { requestId: params.id },
        data: { dueDate: new Date(parsed.data.deadline) },
      });
    }

    // If request cancelled, notify employees
    if (parsed.data.status === "CANCELLED") {
      const assignments = await prisma.requestAssignment.findMany({
        where: { requestId: params.id },
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
      entityId: params.id,
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN"]);
    if (isNextResponse(user)) return user;

    const existing = await prisma.documentRequest.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    await prisma.documentRequest.delete({ where: { id: params.id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE_REQUEST",
      entityType: "request",
      entityId: params.id,
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
