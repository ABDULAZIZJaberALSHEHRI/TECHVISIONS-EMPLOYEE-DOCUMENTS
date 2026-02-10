import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isNextResponse } from "@/lib/auth-guard";
import { getAbsolutePath } from "@/lib/upload";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

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

    const absolutePath = getAbsolutePath(document.filePath);

    if (!existsSync(absolutePath)) {
      return NextResponse.json(
        { success: false, error: "File not found on disk" },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(absolutePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `attachment; filename="${document.fileName}"`,
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
