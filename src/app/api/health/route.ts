import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

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

  // Upload directory check
  const uploadDir = process.env.UPLOAD_DIR || "./uploads";
  try {
    const resolvedPath = path.resolve(uploadDir);
    if (fs.existsSync(resolvedPath)) {
      fs.accessSync(resolvedPath, fs.constants.W_OK | fs.constants.R_OK);
      checks.storage = { status: "ok" };
    } else {
      healthy = false;
      checks.storage = { status: "error", message: "Upload directory does not exist" };
    }
  } catch {
    healthy = false;
    checks.storage = { status: "error", message: "Upload directory not writable" };
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
