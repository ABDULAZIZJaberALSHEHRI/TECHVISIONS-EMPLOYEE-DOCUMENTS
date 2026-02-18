import { NextRequest, NextResponse } from "next/server";
import { requireRole, isNextResponse } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientIp } from "@/lib/audit";
import path from "path";
import fs from "fs/promises";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "branding");

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["ADMIN"]);
    if (isNextResponse(user)) return user;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!type || !["logo", "login_image"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Type must be 'logo' or 'login_image'" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only PNG, JPG, SVG, and WebP images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size must be under 5MB" },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Generate safe filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const prefix = type === "logo" ? "logo" : "login";
    const filename = `${prefix}-${Date.now()}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buffer);

    // Update the corresponding setting
    const settingKey = type === "logo" ? "logo_url" : "login_side_image";
    const imageUrl = `/api/branding/image/${filename}`;

    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      create: { key: settingKey, value: imageUrl },
      update: { value: imageUrl },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_SETTINGS",
      entityType: "settings",
      details: { [settingKey]: imageUrl },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, url: imageUrl });
  } catch (error) {
    console.error("POST /api/upload/branding error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload branding image" },
      { status: 500 }
    );
  }
}
