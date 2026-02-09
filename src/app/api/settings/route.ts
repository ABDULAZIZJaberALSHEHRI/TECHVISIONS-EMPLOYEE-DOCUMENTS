import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isNextResponse } from "@/lib/auth-guard";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { z } from "zod";

export async function GET() {
  try {
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    const settings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({ success: true, data: settingsMap });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

const updateSettingsSchema = z.record(z.string(), z.string());

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireRole(["ADMIN"]);
    if (isNextResponse(user)) return user;

    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid settings format" },
        { status: 400 }
      );
    }

    const updates = Object.entries(parsed.data);

    for (const [key, value] of updates) {
      await prisma.systemSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_SETTINGS",
      entityType: "settings",
      details: parsed.data,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, message: "Settings updated" });
  } catch (error) {
    console.error("PATCH /api/settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
