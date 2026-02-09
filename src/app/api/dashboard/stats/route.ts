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
    const [
      totalRequests,
      pendingSubmissions,
      submittedAwaitingReview,
      overdueCount,
      approvedThisMonth,
      rejectedThisMonth,
    ] = await Promise.all([
      prisma.documentRequest.count({ where: { status: "OPEN" } }),
      prisma.requestAssignment.count({ where: { status: "PENDING" } }),
      prisma.requestAssignment.count({ where: { status: "SUBMITTED" } }),
      prisma.requestAssignment.count({ where: { status: "OVERDUE" } }),
      prisma.requestAssignment.count({
        where: { status: "APPROVED", reviewedAt: { gte: monthStart } },
      }),
      prisma.requestAssignment.count({
        where: { status: "REJECTED", reviewedAt: { gte: monthStart } },
      }),
    ]);

    // Status distribution for donut chart
    const statusDistribution = await prisma.requestAssignment.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    // Requests per month for bar chart (last 6 months)
    const sixMonthsAgo = subMonths(now, 6);
    const requestsPerMonth = await prisma.documentRequest.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
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

    // Recent activity
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        action: { in: ["UPLOAD_DOCUMENT", "APPROVE_DOCUMENT", "REJECT_DOCUMENT", "CREATE_REQUEST"] },
      },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Upcoming deadlines (next 7 days)
    const sevenDaysFromNow = addDays(startOfDay(now), 7);
    const upcomingDeadlines = await prisma.documentRequest.findMany({
      where: {
        status: "OPEN",
        deadline: { gte: startOfDay(now), lte: sevenDaysFromNow },
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
