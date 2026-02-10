import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isNextResponse } from "@/lib/auth-guard";
import { getAccessibleDepartments } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");

    if (!department) {
      return NextResponse.json(
        { success: false, error: "Department parameter is required" },
        { status: 400 }
      );
    }

    // Check permissions
    const accessibleDepts = getAccessibleDepartments(user);
    if (accessibleDepts !== "ALL" && !accessibleDepts.includes(department)) {
      return NextResponse.json(
        { success: false, error: "You do not have access to this department" },
        { status: 403 }
      );
    }

    const employees = await prisma.user.findMany({
      where: {
        department,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        role: true,
        jobTitle: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, employees });
  } catch (error) {
    console.error("GET /api/departments/members error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch department members" },
      { status: 500 }
    );
  }
}
