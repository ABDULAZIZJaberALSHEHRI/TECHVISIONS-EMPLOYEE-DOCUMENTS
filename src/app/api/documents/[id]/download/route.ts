import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isNextResponse } from "@/lib/auth-guard";
import { getFileBuffer } from "@/lib/upload";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        assignment: { select: { employeeId: true } },
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify access: uploader, HR, or Admin
    if (
      user.role === "EMPLOYEE" &&
      document.assignment.employeeId !== user.id
    ) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const fileBuffer = await getFileBuffer(document.filePath);

    // Check if preview mode (for inline display) or download mode
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get("preview") === "true";
    const disposition = isPreview
      ? `inline; filename="${document.fileName}"`
      : `attachment; filename="${document.fileName}"`;

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": disposition,
        "Content-Length": String(document.fileSize),
      },
    });
  } catch (error) {
    console.error("GET /api/documents/[id]/download error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to download document" },
      { status: 500 }
    );
  }
}
