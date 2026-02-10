import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isNextResponse } from "@/lib/auth-guard";
import { createAuditLog, getClientIp } from "@/lib/audit";
import {
  saveTemplateFile,
  deleteTemplateFile,
  validateTemplateFile,
  getTemplateFilePath,
} from "@/lib/upload";
import { existsSync } from "fs";
import { stat } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    const docRequest = await prisma.documentRequest.findUnique({
      where: { id },
      select: { templateUrl: true, templateName: true },
    });

    if (!docRequest || !docRequest.templateUrl) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    const filePath = getTemplateFilePath(docRequest.templateUrl);
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: "Template file not found on disk" },
        { status: 404 }
      );
    }

    const fileStat = await stat(filePath);
    const ext = path.extname(docRequest.templateName || "file").toLowerCase();
    const mimeMap: Record<string, string> = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
    };
    const contentType = mimeMap[ext] || "application/octet-stream";

    const { readFile } = await import("fs/promises");
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${docRequest.templateName || "template"}"`,
        "Content-Length": fileStat.size.toString(),
      },
    });
  } catch (error) {
    console.error("GET /api/requests/[id]/template error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to download template" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole(["ADMIN", "HR", "DEPARTMENT_HEAD"]);
    if (isNextResponse(user)) return user;

    const docRequest = await prisma.documentRequest.findUnique({
      where: { id },
      select: { id: true, createdById: true, title: true },
    });

    if (!docRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    // Only creator, ADMIN, or HR can upload template
    if (
      user.role !== "ADMIN" &&
      user.role !== "HR" &&
      docRequest.createdById !== user.id
    ) {
      return NextResponse.json(
        { success: false, error: "Not authorized to modify this request" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("templateFile") as File;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, error: "Template file is required" },
        { status: 400 }
      );
    }

    const validationError = validateTemplateFile(file);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // Delete old template if exists
    await deleteTemplateFile(id);

    const saved = await saveTemplateFile(file, id);
    await prisma.documentRequest.update({
      where: { id },
      data: {
        templateUrl: saved.filePath,
        templateName: saved.fileName,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPLOAD_TEMPLATE",
      entityType: "request",
      entityId: id,
      details: { fileName: saved.fileName, fileSize: saved.fileSize },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      data: { templateUrl: saved.filePath, templateName: saved.fileName },
    });
  } catch (error) {
    console.error("POST /api/requests/[id]/template error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole(["ADMIN", "HR", "DEPARTMENT_HEAD"]);
    if (isNextResponse(user)) return user;

    const docRequest = await prisma.documentRequest.findUnique({
      where: { id },
      select: { id: true, createdById: true, templateUrl: true },
    });

    if (!docRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    if (
      user.role !== "ADMIN" &&
      user.role !== "HR" &&
      docRequest.createdById !== user.id
    ) {
      return NextResponse.json(
        { success: false, error: "Not authorized to modify this request" },
        { status: 403 }
      );
    }

    if (!docRequest.templateUrl) {
      return NextResponse.json(
        { success: false, error: "No template to delete" },
        { status: 404 }
      );
    }

    await deleteTemplateFile(id);
    await prisma.documentRequest.update({
      where: { id },
      data: { templateUrl: null, templateName: null },
    });

    await createAuditLog({
      userId: user.id,
      action: "DELETE_TEMPLATE",
      entityType: "request",
      entityId: id,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/requests/[id]/template error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
