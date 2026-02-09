import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isNextResponse } from "@/lib/auth-guard";
import { deleteFile } from "@/lib/upload";
import { createAuditLog, getClientIp } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        assignment: {
          include: {
            request: { select: { id: true, title: true } },
            employee: { select: { id: true, name: true } },
          },
        },
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Employee can only see their own documents
    if (
      user.role === "EMPLOYEE" &&
      document.assignment.employeeId !== user.id
    ) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    console.error("GET /api/documents/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        assignment: { select: { employeeId: true, status: true } },
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Only uploader or admin can delete
    if (user.role === "EMPLOYEE" && document.uploadedById !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Can't delete if already approved
    if (document.assignment.status === "APPROVED") {
      return NextResponse.json(
        { success: false, error: "Cannot delete approved documents" },
        { status: 400 }
      );
    }

    await deleteFile(document.filePath);
    await prisma.document.delete({ where: { id: params.id } });

    // If this was the latest, mark previous version as latest
    if (document.isLatest) {
      const previousDoc = await prisma.document.findFirst({
        where: { assignmentId: document.assignmentId },
        orderBy: { version: "desc" },
      });
      if (previousDoc) {
        await prisma.document.update({
          where: { id: previousDoc.id },
          data: { isLatest: true },
        });
      } else {
        // No documents left, revert assignment status
        await prisma.requestAssignment.update({
          where: { id: document.assignmentId },
          data: { status: "PENDING" },
        });
      }
    }

    await createAuditLog({
      userId: user.id,
      action: "DELETE_DOCUMENT",
      entityType: "document",
      entityId: params.id,
      details: { fileName: document.fileName },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, message: "Document deleted" });
  } catch (error) {
    console.error("DELETE /api/documents/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
