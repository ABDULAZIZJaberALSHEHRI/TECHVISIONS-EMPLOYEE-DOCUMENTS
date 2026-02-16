import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isNextResponse } from "@/lib/auth-guard";
import { getFileBuffer } from "@/lib/upload";
import archiver from "archiver";
import { PassThrough } from "stream";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    const assignment = await prisma.requestAssignment.findUnique({
      where: { id },
      include: {
        employee: { select: { name: true } },
        request: {
          select: {
            id: true,
            title: true,
            createdById: true,
            assignedToId: true,
          },
        },
        documents: {
          where: { isLatest: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Only HR, Admin, or request creator can download
    if (
      user.role !== "ADMIN" &&
      user.role !== "HR" &&
      assignment.request.createdById !== user.id &&
      assignment.request.assignedToId !== user.id
    ) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    if (assignment.documents.length === 0) {
      return NextResponse.json(
        { success: false, error: "No documents found" },
        { status: 404 }
      );
    }

    // Read all file buffers first before creating the archive
    const fileEntries: { name: string; buffer: Buffer }[] = [];
    for (const doc of assignment.documents) {
      const fileBuffer = await getFileBuffer(doc.filePath);
      fileEntries.push({ name: doc.fileName, buffer: Buffer.from(fileBuffer) });
    }

    // Create a zip archive and pipe through a PassThrough stream to avoid backpressure deadlock
    const archive = archiver("zip", { zlib: { level: 5 } });
    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    // Collect all data from the piped stream
    const chunks: Buffer[] = [];
    const archiveReady = new Promise<Buffer>((resolve, reject) => {
      passThrough.on("data", (chunk: Buffer) => chunks.push(chunk));
      passThrough.on("end", () => resolve(Buffer.concat(chunks)));
      passThrough.on("error", (err) => reject(err));
      archive.on("error", (err) => reject(err));
    });

    // Append all pre-loaded files to the archive
    for (const entry of fileEntries) {
      archive.append(entry.buffer, { name: entry.name });
    }

    // Finalize and wait for the stream to complete
    archive.finalize();
    const zipBuffer = await archiveReady;

    const zipFileName = `${assignment.employee.name}_${assignment.request.title}_documents.zip`
      .replace(/[^a-z0-9_\-\.]/gi, "_")
      .substring(0, 200);

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFileName}"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error("GET /api/assignments/[id]/download-all error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create zip archive" },
      { status: 500 }
    );
  }
}
