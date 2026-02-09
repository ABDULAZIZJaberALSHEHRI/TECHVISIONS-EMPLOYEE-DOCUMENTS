const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("\n  DRMS Database Status");
  console.log("  " + "=".repeat(50));

  // Connection check
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("  Connection:  OK");
  } catch (e) {
    console.log("  Connection:  FAILED - " + e.message);
    return;
  }

  // Table counts
  const counts = {
    Users: await prisma.user.count(),
    Categories: await prisma.category.count(),
    "Document Requests": await prisma.documentRequest.count(),
    Assignments: await prisma.requestAssignment.count(),
    Documents: await prisma.document.count(),
    Attachments: await prisma.requestAttachment.count(),
    Notifications: await prisma.notification.count(),
    "Audit Logs": await prisma.auditLog.count(),
    "System Settings": await prisma.systemSetting.count(),
  };

  console.log("\n  Record Counts:");
  console.log("  " + "-".repeat(35));
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table.padEnd(22)} ${count}`);
  }

  // Role breakdown
  const roles = await prisma.user.groupBy({ by: ["role"], _count: true });
  if (roles.length > 0) {
    console.log("\n  Users by Role:");
    console.log("  " + "-".repeat(35));
    for (const r of roles) {
      console.log(`  ${r.role.padEnd(22)} ${r._count}`);
    }
  }

  // Request status breakdown
  const statuses = await prisma.documentRequest.groupBy({ by: ["status"], _count: true });
  if (statuses.length > 0) {
    console.log("\n  Requests by Status:");
    console.log("  " + "-".repeat(35));
    for (const s of statuses) {
      console.log(`  ${s.status.padEnd(22)} ${s._count}`);
    }
  }

  // Assignment status breakdown
  const assignStatuses = await prisma.requestAssignment.groupBy({ by: ["status"], _count: true });
  if (assignStatuses.length > 0) {
    console.log("\n  Assignments by Status:");
    console.log("  " + "-".repeat(35));
    for (const s of assignStatuses) {
      console.log(`  ${s.status.padEnd(22)} ${s._count}`);
    }
  }

  // Latest users
  const latestUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { email: true, name: true, role: true, createdAt: true },
  });
  if (latestUsers.length > 0) {
    console.log("\n  Latest Users:");
    console.log("  " + "-".repeat(70));
    for (const u of latestUsers) {
      console.log(`  ${u.email.padEnd(35)} ${u.role.padEnd(10)} ${u.createdAt.toISOString().slice(0, 16)}`);
    }
  }

  // Latest audit logs
  const latestLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { user: { select: { email: true } } },
  });
  if (latestLogs.length > 0) {
    console.log("\n  Latest Audit Logs:");
    console.log("  " + "-".repeat(70));
    for (const log of latestLogs) {
      const who = log.user?.email || "system";
      console.log(`  ${log.createdAt.toISOString().slice(0, 16)}  ${log.action.padEnd(20)} by ${who}`);
    }
  }

  console.log("\n  " + "=".repeat(50) + "\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
