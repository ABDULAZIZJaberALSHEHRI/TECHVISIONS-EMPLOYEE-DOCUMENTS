import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isNextResponse } from "@/lib/auth-guard";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { z } from "zod";

const createListSchema = z.object({
  name: z.string().min(1, "List name is required").max(100),
  memberIds: z.array(z.string()).min(1, "At least one member is required"),
});

export async function GET() {
  try {
    const user = await requireRole(["ADMIN", "HR", "DEPARTMENT_HEAD"]);
    if (isNextResponse(user)) return user;

    const lists = await prisma.employeeList.findMany({
      where: { createdById: user.id },
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
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: lists });
  } catch (error) {
    console.error("GET /api/employee-lists error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch employee lists" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["ADMIN", "HR", "DEPARTMENT_HEAD"]);
    if (isNextResponse(user)) return user;

    const body = await request.json();
    const parsed = createListSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, memberIds } = parsed.data;

    // Check for duplicate name for this user
    const existing = await prisma.employeeList.findFirst({
      where: { createdById: user.id, name },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A list with this name already exists" },
        { status: 409 }
      );
    }

    const list = await prisma.employeeList.create({
      data: {
        name,
        createdById: user.id,
        members: {
          create: memberIds.map((id) => ({ employeeId: id })),
        },
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

    await createAuditLog({
      userId: user.id,
      action: "CREATE_EMPLOYEE_LIST",
      entityType: "employee_list",
      entityId: list.id,
      details: { name, memberCount: memberIds.length },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: list }, { status: 201 });
  } catch (error) {
    console.error("POST /api/employee-lists error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create employee list" },
      { status: 500 }
    );
  }
}
