import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { status: string; message?: string }> = {};
  let healthy = true;

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok" };
  } catch (error) {
    healthy = false;
    checks.database = {
      status: "error",
      message: error instanceof Error ? error.message : "Database unreachable",
    };
  }

  // S3 storage check
  try {
    const s3 = new S3Client({
      region: process.env.OCI_REGION || "me-riyadh-1",
      endpoint: process.env.OCI_ENDPOINT,
      credentials: {
        accessKeyId: process.env.OCI_ACCESS_KEY || "",
        secretAccessKey: process.env.OCI_SECRET_KEY || "",
      },
      forcePathStyle: true,
    });
    await s3.send(new HeadBucketCommand({ Bucket: process.env.OCI_BUCKET || "drms-uploads" }));
    checks.storage = { status: "ok" };
  } catch (error) {
    // If credentials are not set, mark as warning rather than error
    if (!process.env.OCI_ACCESS_KEY) {
      checks.storage = { status: "warning", message: "S3 credentials not configured" };
    } else {
      healthy = false;
      checks.storage = {
        status: "error",
        message: error instanceof Error ? error.message : "S3 bucket unreachable",
      };
    }
  }

  const response = {
    status: healthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    uptime: process.uptime(),
    checks,
  };

  return NextResponse.json(response, { status: healthy ? 200 : 503 });
}
