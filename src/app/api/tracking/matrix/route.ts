import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isNextResponse } from "@/lib/auth-guard";
import { canViewTrackingMatrix, getAccessibleDepartments } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    if (!canViewTrackingMatrix(user)) {
      return NextResponse.json(
        { success: false, error: "Not authorized to view tracking matrix" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department") || undefined;
    const requestId = searchParams.get("requestId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    // Permission check for department filter
    if (department && !canViewTrackingMatrix(user, department)) {
      return NextResponse.json(
        { success: false, error: "Not authorized for this department" },
        { status: 403 }
      );
    }

    // Build employee filter
    const employeeWhere: Record<string, unknown> = { isActive: true };
    const accessibleDepts = getAccessibleDepartments(user);

    if (department) {
      employeeWhere.department = department;
    } else if (accessibleDepts !== "ALL") {
      employeeWhere.department = { in: accessibleDepts };
    }

    if (search) {
      employeeWhere.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Build assignment filter
    const assignmentWhere: Record<string, unknown> = {};
    if (requestId) {
      assignmentWhere.requestId = requestId;
    }
    if (status) {
      assignmentWhere.status = status;
    }

    // Get employees with their assignments
    const employees = await prisma.user.findMany({
      where: employeeWhere,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        assignments: {
          where: {
            ...assignmentWhere,
            request: { status: "OPEN" },
          },
          select: {
            id: true,
            status: true,
            submittedAt: true,
            dueDate: true,
            reminderCount: true,
            lastReminderAt: true,
            request: {
              select: {
                id: true,
                title: true,
                priority: true,
                deadline: true,
                templateUrl: true,
              },
            },
            _count: {
              select: { documents: true },
            },
          },
          orderBy: { request: { deadline: "asc" } },
        },
      },
      orderBy: [{ department: "asc" }, { name: "asc" }],
    });

    const now = new Date();
    let totalAssignments = 0;
    let completedAssignments = 0;
    let overdueCount = 0;

    const formattedEmployees = employees.map((emp) => {
      const requests = emp.assignments.map((a) => {
        totalAssignments++;
        const isOverdue = a.dueDate < now && !["APPROVED", "SUBMITTED"].includes(a.status);
        if (a.status === "APPROVED" || a.status === "SUBMITTED") completedAssignments++;
        if (isOverdue) overdueCount++;

        return {
          requestId: a.request.id,
          requestTitle: a.request.title,
          assignmentId: a.id,
          status: a.status,
          submittedAt: a.submittedAt,
          dueDate: a.dueDate,
          priority: a.request.priority,
          isOverdue,
          hasDocuments: a._count.documents > 0,
          hasTemplate: !!a.request.templateUrl,
          reminderCount: a.reminderCount,
          lastReminderAt: a.lastReminderAt,
        };
      });

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        department: emp.department,
        requests,
      };
    });

    // Filter out employees with no assignments if a request or status filter is applied
    const filtered = (requestId || status)
      ? formattedEmployees.filter((e) => e.requests.length > 0)
      : formattedEmployees;

    const summary = {
      totalEmployees: filtered.length,
      totalRequests: totalAssignments,
      completionRate: totalAssignments > 0
        ? Math.round((completedAssignments / totalAssignments) * 100)
        : 0,
      overdue: overdueCount,
      pending: totalAssignments - completedAssignments - overdueCount,
    };

    return NextResponse.json({
      success: true,
      employees: filtered,
      summary,
    });
  } catch (error) {
    console.error("GET /api/tracking/matrix error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tracking matrix" },
      { status: 500 }
    );
  }
}
