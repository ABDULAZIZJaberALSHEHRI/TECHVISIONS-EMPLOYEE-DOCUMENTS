import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isNextResponse } from "@/lib/auth-guard";
import { getUploadDir } from "@/lib/upload";
import archiver from "archiver";
import path from "path";
import { createReadStream, existsSync } from "fs";
import { PassThrough } from "stream";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "HR"]);
    if (isNextResponse(user)) return user;

    const docRequest = await prisma.documentRequest.findUnique({
      where: { id: params.id },
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

    const uploadDir = getUploadDir();
    const archive = archiver("zip", { zlib: { level: 5 } });
    const passthrough = new PassThrough();
    archive.pipe(passthrough);

    let fileCount = 0;
    for (const assignment of docRequest.assignments) {
      for (const doc of assignment.documents) {
        const filePath = path.join(uploadDir, doc.filePath);
        if (existsSync(filePath)) {
          const folderName = assignment.employee.name.replace(/[^a-zA-Z0-9]/g, "_");
          archive.append(createReadStream(filePath), {
            name: `${folderName}/${doc.fileName}`,
          });
          fileCount++;
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

    return new NextResponse(buffer, {
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
