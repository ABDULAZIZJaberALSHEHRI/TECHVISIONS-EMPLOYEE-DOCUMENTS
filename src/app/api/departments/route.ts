import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isNextResponse } from "@/lib/auth-guard";
import { getAccessibleDepartments } from "@/lib/permissions";

export async function GET() {
  try {
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    const accessibleDepts = getAccessibleDepartments(user);

    const where: Record<string, unknown> = {
      department: { not: null },
      isActive: true,
    };

    if (accessibleDepts !== "ALL") {
      where.department = { in: accessibleDepts };
    }

    const users = await prisma.user.findMany({
      where,
      select: { department: true },
      distinct: ["department"],
      orderBy: { department: "asc" },
    });

    const departments = users
      .map((u) => u.department)
      .filter((d): d is string => d !== null);

    return NextResponse.json({ success: true, departments });
  } catch (error) {
    console.error("GET /api/departments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["ADMIN"]);
    if (isNextResponse(user)) return user;

    const { department } = await request.json();

    if (!department || typeof department !== "string" || department.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Department name is required" },
        { status: 400 }
      );
    }

    // Check if any user already has this department
    const existing = await prisma.user.findFirst({
      where: { department: department.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Department already exists" },
        { status: 409 }
      );
    }

    // We store departments as user attributes, so this is informational.
    // The department will exist once assigned to a user.
    return NextResponse.json({
      success: true,
      department: department.trim(),
      message: "Department registered. Assign it to users to make it active.",
    });
  } catch (error) {
    console.error("POST /api/departments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create department" },
      { status: 500 }
    );
  }
}
