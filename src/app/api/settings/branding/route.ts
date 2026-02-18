import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BRANDING_KEYS = [
  "app_name",
  "app_subtitle",
  "logo_url",
  "login_side_image",
  "primary_color",
];

const BRANDING_DEFAULTS: Record<string, string> = {
  app_name: "DRMS",
  app_subtitle: "Document Management",
  logo_url: "",
  login_side_image: "",
  primary_color: "#2563EB",
};

// Public endpoint - no auth required (login page needs this before user is authenticated)
export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: BRANDING_KEYS } },
    });

    const settingsMap: Record<string, string> = { ...BRANDING_DEFAULTS };
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({ success: true, data: settingsMap });
  } catch (error) {
    console.error("GET /api/settings/branding error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch branding settings" },
      { status: 500 }
    );
  }
}
