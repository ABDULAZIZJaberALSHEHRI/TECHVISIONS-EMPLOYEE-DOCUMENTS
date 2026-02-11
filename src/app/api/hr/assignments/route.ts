import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isNextResponse } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["HR", "ADMIN"]);
    if (isNextResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get("countOnly") === "true";

    // For badge count: only PENDING_HR requests assigned to this HR user (not self-created)
    if (countOnly) {
      const pendingCount = await prisma.documentRequest.count({
        where: {
          assignedToId: user.id,
          NOT: { createdById: user.id },
          status: "PENDING_HR",
        },
      });
      return NextResponse.json({ success: true, pendingCount });
    }

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "12");
    const priority = searchParams.get("priority") || "";
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    // STRICT ISOLATION: Only requests assigned TO this HR user, NOT created by them
    // "My Requests" (created by HR) lives at /hr/requests — NOT here
    const where: Record<string, unknown> = {
      assignedToId: user.id,
      NOT: { createdById: user.id },
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
            { createdBy: { name: { contains: search } } },
          ],
        },
      ];
    }

    const [requests, total, pendingCount] = await Promise.all([
      prisma.documentRequest.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          _count: { select: { assignments: true, attachments: true } },
        },
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.documentRequest.count({ where }),
      prisma.documentRequest.count({
        where: {
          assignedToId: user.id,
          NOT: { createdById: user.id },
          status: "PENDING_HR",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: requests,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      pendingCount,
    });
  } catch (error) {
    console.error("GET /api/hr/assignments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch assigned requests" },
      { status: 500 }
    );
  }
}
