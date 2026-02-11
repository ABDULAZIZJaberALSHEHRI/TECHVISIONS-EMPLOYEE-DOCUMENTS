import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isNextResponse } from "@/lib/auth-guard";
import { startOfMonth, subMonths, format, startOfDay, addDays } from "date-fns";

export async function GET() {
  try {
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    const now = new Date();
    const monthStart = startOfMonth(now);

    if (user.role === "EMPLOYEE") {
      // Employee dashboard stats
      const [totalAssigned, completed, pending, overdue] = await Promise.all([
        prisma.requestAssignment.count({
          where: { employeeId: user.id },
        }),
        prisma.requestAssignment.count({
          where: { employeeId: user.id, status: "APPROVED" },
        }),
        prisma.requestAssignment.count({
          where: { employeeId: user.id, status: { in: ["PENDING", "SUBMITTED"] } },
        }),
        prisma.requestAssignment.count({
          where: { employeeId: user.id, status: "OVERDUE" },
        }),
      ]);

      // Recent activity
      const recentActivity = await prisma.requestAssignment.findMany({
        where: {
          employeeId: user.id,
          status: { in: ["APPROVED", "REJECTED", "SUBMITTED"] },
        },
        include: {
          request: { select: { id: true, title: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      });

      // Pending requests sorted by urgency
      const pendingRequests = await prisma.requestAssignment.findMany({
        where: {
          employeeId: user.id,
          status: { in: ["PENDING", "OVERDUE"] },
        },
        include: {
          request: {
            include: {
              category: { select: { name: true } },
            },
          },
        },
        orderBy: [{ status: "desc" }, { dueDate: "asc" }],
      });

      return NextResponse.json({
        success: true,
        data: {
          stats: { totalAssigned, completed, pending, overdue },
          recentActivity,
          pendingRequests,
        },
      });
    }

    // HR / Admin dashboard stats
    // SECURITY: HR must only see stats for requests they created or are assigned to
    const isHR = user.role === "HR";
    const requestScope = isHR
      ? { OR: [{ createdById: user.id }, { assignedToId: user.id }] }
      : {};
    const assignmentRequestScope = isHR
      ? { request: { OR: [{ createdById: user.id }, { assignedToId: user.id }] } }
      : {};

    const [
      totalRequests,
      pendingSubmissions,
      submittedAwaitingReview,
      overdueCount,
      approvedThisMonth,
      rejectedThisMonth,
    ] = await Promise.all([
      prisma.documentRequest.count({
        where: { status: { in: ["OPEN", "PENDING_HR"] }, ...requestScope },
      }),
      prisma.requestAssignment.count({
        where: { status: "PENDING", ...assignmentRequestScope },
      }),
      prisma.requestAssignment.count({
        where: { status: "SUBMITTED", ...assignmentRequestScope },
      }),
      prisma.requestAssignment.count({
        where: { status: "OVERDUE", ...assignmentRequestScope },
      }),
      prisma.requestAssignment.count({
        where: { status: "APPROVED", reviewedAt: { gte: monthStart }, ...assignmentRequestScope },
      }),
      prisma.requestAssignment.count({
        where: { status: "REJECTED", reviewedAt: { gte: monthStart }, ...assignmentRequestScope },
      }),
    ]);

    // Workload overview (HR only): Personal vs Assigned breakdown
    let workloadOverview = { personalRequests: 0, assignedTasks: 0 };
    if (isHR) {
      const [personal, assigned] = await Promise.all([
        prisma.documentRequest.count({
          where: { createdById: user.id, status: { in: ["OPEN", "PENDING_HR"] } },
        }),
        prisma.documentRequest.count({
          where: {
            assignedToId: user.id,
            createdById: { not: user.id },
            status: { in: ["OPEN", "PENDING_HR"] },
          },
        }),
      ]);
      workloadOverview = { personalRequests: personal, assignedTasks: assigned };
    }

    // Status distribution for donut chart — scoped
    const statusDistribution = await prisma.requestAssignment.groupBy({
      by: ["status"],
      where: assignmentRequestScope,
      _count: { status: true },
    });

    // Requests per month for bar chart (last 6 months) — scoped
    const sixMonthsAgo = subMonths(now, 6);
    const requestsPerMonth = await prisma.documentRequest.findMany({
      where: { createdAt: { gte: sixMonthsAgo }, ...requestScope },
      select: { createdAt: true },
    });

    const monthlyData: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(now, i);
      monthlyData[format(month, "MMM yyyy")] = 0;
    }
    for (const req of requestsPerMonth) {
      const key = format(req.createdAt, "MMM yyyy");
      if (key in monthlyData) {
        monthlyData[key]++;
      }
    }

    // Recent activity — scoped for HR
    const activityWhere: Record<string, unknown> = {
      action: { in: ["UPLOAD_DOCUMENT", "APPROVE_DOCUMENT", "REJECT_DOCUMENT", "CREATE_REQUEST"] },
    };
    if (isHR) {
      activityWhere.userId = user.id;
    }

    const recentActivity = await prisma.auditLog.findMany({
      where: activityWhere,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Upcoming deadlines (next 7 days) — scoped
    const sevenDaysFromNow = addDays(startOfDay(now), 7);
    const upcomingDeadlines = await prisma.documentRequest.findMany({
      where: {
        status: { in: ["OPEN", "PENDING_HR"] },
        deadline: { gte: startOfDay(now), lte: sevenDaysFromNow },
        ...requestScope,
      },
      include: {
        _count: { select: { assignments: true } },
        assignments: {
          select: { status: true },
        },
      },
      orderBy: { deadline: "asc" },
      take: 10,
    });

    const deadlinesWithCompletion = upcomingDeadlines.map((req) => {
      const total = req.assignments.length;
      const completed = req.assignments.filter(
        (a) => a.status === "APPROVED"
      ).length;
      return {
        id: req.id,
        title: req.title,
        deadline: req.deadline,
        totalAssignments: total,
        completedAssignments: completed,
        completionPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalRequests,
          pendingSubmissions,
          submittedAwaitingReview,
          overdue: overdueCount,
          approvedThisMonth,
          rejectedThisMonth,
        },
        workloadOverview,
        statusDistribution: statusDistribution.map((s) => ({
          status: s.status,
          count: s._count.status,
        })),
        requestsPerMonth: Object.entries(monthlyData).map(([month, count]) => ({
          month,
          count,
        })),
        recentActivity,
        upcomingDeadlines: deadlinesWithCompletion,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
