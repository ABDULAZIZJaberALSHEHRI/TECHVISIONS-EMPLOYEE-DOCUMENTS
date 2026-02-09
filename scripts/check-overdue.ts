import { PrismaClient } from "@prisma/client";
import { startOfDay, subDays, differenceInDays } from "date-fns";

const prisma = new PrismaClient();

async function checkOverdue() {
  console.log(`[${new Date().toISOString()}] Running overdue check...`);

  const today = startOfDay(new Date());

  // 1. Mark overdue assignments
  const overdueAssignments = await prisma.requestAssignment.findMany({
    where: {
      status: "PENDING",
      dueDate: { lt: today },
    },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      request: { select: { id: true, title: true, deadline: true } },
    },
  });

  if (overdueAssignments.length > 0) {
    await prisma.requestAssignment.updateMany({
      where: {
        id: { in: overdueAssignments.map((a) => a.id) },
      },
      data: { status: "OVERDUE" },
    });

    console.log(`Marked ${overdueAssignments.length} assignments as OVERDUE`);

    // Create notifications for affected employees
    await prisma.notification.createMany({
      data: overdueAssignments.map((a) => ({
        userId: a.employee.id,
        type: "OVERDUE" as const,
        title: "Document Request Overdue",
        message: `"${a.request.title}" is now overdue. Please submit as soon as possible.`,
        link: `/employee/requests/${a.request.id}`,
      })),
    });

    // Notify HR users
    const hrUsers = await prisma.user.findMany({
      where: { role: { in: ["HR", "ADMIN"] }, isActive: true },
      select: { id: true },
    });

    if (hrUsers.length > 0) {
      await prisma.notification.createMany({
        data: hrUsers.map((hr) => ({
          userId: hr.id,
          type: "OVERDUE" as const,
          title: "New Overdue Submissions",
          message: `${overdueAssignments.length} assignment(s) became overdue today.`,
          link: "/hr/requests?status=OVERDUE",
        })),
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: "OVERDUE_CHECK",
        entityType: "system",
        details: {
          overdueCount: overdueAssignments.length,
          assignments: overdueAssignments.map((a) => ({
            id: a.id,
            employee: a.employee.name,
            request: a.request.title,
          })),
        },
      },
    });
  } else {
    console.log("No new overdue assignments found");
  }

  // 2. Send deadline approaching reminders
  const settingRow = await prisma.systemSetting.findUnique({
    where: { key: "reminder_days_before" },
  });
  const reminderDays = (settingRow?.value || "3,1")
    .split(",")
    .map((d) => parseInt(d.trim()))
    .filter((d) => !isNaN(d));

  for (const days of reminderDays) {
    const targetDate = startOfDay(new Date());
    targetDate.setDate(targetDate.getDate() + days);

    const upcomingAssignments = await prisma.requestAssignment.findMany({
      where: {
        status: "PENDING",
        dueDate: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        request: { select: { id: true, title: true, deadline: true } },
      },
    });

    if (upcomingAssignments.length > 0) {
      console.log(
        `Sending ${days}-day reminders to ${upcomingAssignments.length} employees`
      );

      await prisma.notification.createMany({
        data: upcomingAssignments.map((a) => ({
          userId: a.employee.id,
          type: "DEADLINE_APPROACHING" as const,
          title: "Deadline Approaching",
          message: `"${a.request.title}" is due in ${days} day(s).`,
          link: `/employee/requests/${a.request.id}`,
        })),
      });
    }
  }

  console.log(`[${new Date().toISOString()}] Overdue check complete`);
}

checkOverdue()
  .catch((e) => {
    console.error("Overdue check failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
