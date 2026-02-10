import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isNextResponse } from "@/lib/auth-guard";
import { z } from "zod";

const markReadSchema = z.object({
  notificationId: z.string().optional(),
  markAll: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    const body = await request.json();
    const parsed = markReadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    if (parsed.data.markAll) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
    } else if (parsed.data.notificationId) {
      // Verify the notification belongs to this user
      const notification = await prisma.notification.findUnique({
        where: { id: parsed.data.notificationId },
      });

      if (!notification || notification.userId !== user.id) {
        return NextResponse.json(
          { success: false, error: "Notification not found" },
          { status: 404 }
        );
      }

      await prisma.notification.update({
        where: { id: parsed.data.notificationId },
        data: { isRead: true },
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Provide notificationId or markAll" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Marked as read" });
  } catch (error) {
    console.error("PATCH /api/notifications/read error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
