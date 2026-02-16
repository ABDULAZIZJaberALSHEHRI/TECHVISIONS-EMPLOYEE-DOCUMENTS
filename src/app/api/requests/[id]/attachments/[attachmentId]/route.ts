import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isNextResponse } from "@/lib/auth-guard";
import { getFileBuffer } from "@/lib/upload";
import { MIME_TYPE_MAP } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params;
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    // Fetch attachment and verify it belongs to the request
    const attachment = await prisma.requestAttachment.findFirst({
      where: { id: attachmentId, requestId: id },
      include: {
        request: {
          select: {
            createdById: true,
            assignedToId: true,
            assignments: { select: { employeeId: true } },
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Access check: creator, assigned HR, assigned employee, dept head, or admin
    const isCreator = attachment.request.createdById === user.id;
    const isAssignedHR = attachment.request.assignedToId === user.id;
    const isEmployee = attachment.request.assignments.some((a) => a.employeeId === user.id);
    const isAdmin = user.role === "ADMIN";
    const isDeptHeadOrHR = user.role === "DEPARTMENT_HEAD" || user.role === "HR";

    if (!isCreator && !isAssignedHR && !isEmployee && !isAdmin && !isDeptHeadOrHR) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const fileBuffer = await getFileBuffer(attachment.filePath);

    // Determine MIME type
    const ext = attachment.fileName.split(".").pop()?.toLowerCase() || "";
    const mimeTypes = MIME_TYPE_MAP[ext];
    const contentType = attachment.mimeType || (mimeTypes ? mimeTypes[0] : "application/octet-stream");

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${attachment.fileName}"`,
        "Content-Length": String(attachment.fileSize),
      },
    });
  } catch (error) {
    console.error("GET /api/requests/[id]/attachments/[attachmentId] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to download attachment" },
      { status: 500 }
    );
  }
}
