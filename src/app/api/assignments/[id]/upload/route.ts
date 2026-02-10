import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isNextResponse, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";
import { saveFile, validateFileType, validateFileSize } from "@/lib/upload";
import { createAuditLog, getClientIp } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    if (!checkRateLimit(`upload:${user.id}`, 20, 60000)) {
      return rateLimitResponse();
    }

    const assignment = await prisma.requestAssignment.findUnique({
      where: { id },
      include: {
        request: {
          select: {
            id: true,
            title: true,
            acceptedFormats: true,
            maxFileSizeMb: true,
            status: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Employee can only upload to their own assignment
    if (user.role === "EMPLOYEE" && assignment.employeeId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    if (assignment.request.status !== "OPEN") {
      return NextResponse.json(
        { success: false, error: "This request is no longer accepting submissions" },
        { status: 400 }
      );
    }

    if (assignment.status === "APPROVED") {
      return NextResponse.json(
        { success: false, error: "This assignment has already been approved" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const note = (formData.get("note") as string) || null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (
      assignment.request.acceptedFormats &&
      !validateFileType(file.type, assignment.request.acceptedFormats)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `File type not accepted. Allowed formats: ${assignment.request.acceptedFormats}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (!validateFileSize(file.size, assignment.request.maxFileSizeMb)) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size: ${assignment.request.maxFileSizeMb}MB`,
        },
        { status: 400 }
      );
    }

    // Mark previous documents as not latest
    const currentVersion = await prisma.document.count({
      where: { assignmentId: assignment.id },
    });

    await prisma.document.updateMany({
      where: { assignmentId: assignment.id, isLatest: true },
      data: { isLatest: false },
    });

    const saved = await saveFile(file, assignment.requestId, assignment.id);

    const document = await prisma.document.create({
      data: {
        assignmentId: assignment.id,
        uploadedById: user.id,
        fileName: saved.fileName,
        filePath: saved.filePath,
        fileSize: saved.fileSize,
        mimeType: saved.mimeType,
        note,
        version: currentVersion + 1,
        isLatest: true,
      },
    });

    // Update assignment status to SUBMITTED
    await prisma.requestAssignment.update({
      where: { id: assignment.id },
      data: { status: "SUBMITTED" },
    });

    // Notify HR about the submission
    const hrUsers = await prisma.user.findMany({
      where: { role: { in: ["HR", "ADMIN"] }, isActive: true },
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: hrUsers.map((hr) => ({
        userId: hr.id,
        type: "SYSTEM" as const,
        title: "New Document Submission",
        message: `${user.name} submitted a document for "${assignment.request.title}"`,
        link: `/hr/requests/${assignment.requestId}`,
      })),
    });

    await createAuditLog({
      userId: user.id,
      action: "UPLOAD_DOCUMENT",
      entityType: "document",
      entityId: document.id,
      details: {
        fileName: saved.fileName,
        requestTitle: assignment.request.title,
        version: currentVersion + 1,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: document }, { status: 201 });
  } catch (error) {
    console.error("POST /api/assignments/[id]/upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
