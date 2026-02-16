import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isNextResponse } from "@/lib/auth-guard";
import { getFileBuffer } from "@/lib/upload";
import archiver from "archiver";
import { PassThrough } from "stream";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole(["ADMIN", "HR"]);
    if (isNextResponse(user)) return user;

    const docRequest = await prisma.documentRequest.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            employee: { select: { name: true } },
            documents: {
              where: { isLatest: true },
            },
          },
        },
      },
    });

    if (!docRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    // HR can only download documents from requests they created or are assigned to
    if (user.role === "HR" && docRequest.createdById !== user.id && docRequest.assignedToId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const archive = archiver("zip", { zlib: { level: 5 } });
    const passthrough = new PassThrough();
    archive.pipe(passthrough);

    let fileCount = 0;
    for (const assignment of docRequest.assignments) {
      for (const doc of assignment.documents) {
        try {
          const buffer = await getFileBuffer(doc.filePath);
          const folderName = assignment.employee.name.replace(/[^a-zA-Z0-9]/g, "_");
          archive.append(buffer, {
            name: `${folderName}/${doc.fileName}`,
          });
          fileCount++;
        } catch {
          console.warn(`File not found in S3: ${doc.filePath}`);
        }
      }
    }

    if (fileCount === 0) {
      return NextResponse.json(
        { success: false, error: "No documents to download" },
        { status: 404 }
      );
    }

    archive.finalize();

    const chunks: Uint8Array[] = [];
    for await (const chunk of passthrough) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const safeTitle = docRequest.title.replace(/[^a-zA-Z0-9]/g, "_");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeTitle}_documents.zip"`,
      },
    });
  } catch (error) {
    console.error("GET /api/requests/[id]/download error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to download documents" },
      { status: 500 }
    );
  }
}
