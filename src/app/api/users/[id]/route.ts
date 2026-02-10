import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isNextResponse } from "@/lib/auth-guard";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { z } from "zod";

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "HR", "DEPARTMENT_HEAD", "EMPLOYEE"]).optional(),
  isActive: z.boolean().optional(),
  department: z.string().optional(),
  managedDepartment: z.string().nullable().optional(),
  jobTitle: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireRole(["ADMIN", "HR"]);
    if (isNextResponse(authUser)) return authUser;

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        jobTitle: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            assignments: true,
            documents: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireRole(["ADMIN"]);
    if (isNextResponse(authUser)) return authUser;

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: parsed.data,
    });

    await createAuditLog({
      userId: authUser.id,
      action: "UPDATE_USER",
      entityType: "user",
      entityId: params.id,
      details: { changes: parsed.data },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 }
    );
  }
}
