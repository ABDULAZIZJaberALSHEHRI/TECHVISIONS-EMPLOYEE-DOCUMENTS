import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isNextResponse } from "@/lib/auth-guard";
import { canAccessRequest } from "@/lib/permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole(["HR", "ADMIN"]);
    if (isNextResponse(user)) return user;

    const request = await prisma.documentRequest.findUnique({
      where: { id },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        documentSlots: { orderBy: { sortOrder: "asc" } },
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

    if (!request) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    // Unified access: HR processor, employee target, or ADMIN
    const employeeTargetIds = request.assignments.map((a) => a.employee.id);
    if (!canAccessRequest(user, {
      createdById: request.createdById,
      assignedToId: request.assignedToId,
      employeeTargetIds,
    })) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: request });
  } catch (error) {
    console.error("GET /api/hr/assignments/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch assignment request" },
      { status: 500 }
    );
  }
}
