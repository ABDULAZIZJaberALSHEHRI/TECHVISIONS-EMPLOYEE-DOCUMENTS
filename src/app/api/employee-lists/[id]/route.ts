import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isNextResponse } from "@/lib/auth-guard";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { z } from "zod";

const updateListSchema = z.object({
  name: z.string().min(1, "List name is required").max(100).optional(),
  memberIds: z.array(z.string()).min(1, "At least one member is required").optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["ADMIN", "HR", "DEPARTMENT_HEAD"]);
    if (isNextResponse(user)) return user;

    const { id } = await params;

    const list = await prisma.employeeList.findFirst({
      where: { id, createdById: user.id },
      include: {
        members: {
          include: {
            employee: {
              select: { id: true, name: true, email: true, department: true, isActive: true },
            },
          },
        },
        _count: { select: { members: true } },
      },
    });

    if (!list) {
      return NextResponse.json(
        { success: false, error: "List not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("GET /api/employee-lists/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch employee list" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["ADMIN", "HR", "DEPARTMENT_HEAD"]);
    if (isNextResponse(user)) return user;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateListSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.employeeList.findFirst({
      where: { id, createdById: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "List not found" },
        { status: 404 }
      );
    }

    const { name, memberIds } = parsed.data;

    // Check duplicate name if renaming
    if (name && name !== existing.name) {
      const duplicate = await prisma.employeeList.findFirst({
        where: { createdById: user.id, name, id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "A list with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Update in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      if (memberIds) {
        await tx.employeeListMember.deleteMany({ where: { listId: id } });
      }

      return tx.employeeList.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(memberIds && {
            members: {
              create: memberIds.map((eid) => ({ employeeId: eid })),
            },
          }),
        },
        include: {
          members: {
            include: {
              employee: {
                select: { id: true, name: true, email: true, department: true, isActive: true },
              },
            },
          },
          _count: { select: { members: true } },
        },
      });
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_EMPLOYEE_LIST",
      entityType: "employee_list",
      entityId: id,
      details: { name: updated.name, memberCount: updated._count.members },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/employee-lists/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update employee list" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["ADMIN", "HR", "DEPARTMENT_HEAD"]);
    if (isNextResponse(user)) return user;

    const { id } = await params;

    const existing = await prisma.employeeList.findFirst({
      where: { id, createdById: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "List not found" },
        { status: 404 }
      );
    }

    await prisma.employeeList.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE_EMPLOYEE_LIST",
      entityType: "employee_list",
      entityId: id,
      details: { name: existing.name },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, message: "List deleted" });
  } catch (error) {
    console.error("DELETE /api/employee-lists/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete employee list" },
      { status: 500 }
    );
  }
}
