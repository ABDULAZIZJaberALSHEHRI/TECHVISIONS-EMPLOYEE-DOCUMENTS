const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const search = process.argv[2];

  if (!search) {
    // List all users
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, role: true, department: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    if (users.length === 0) { console.log("No users in database."); return; }

    console.log(`\n  All Users (${users.length}):`);
    console.log("  " + "-".repeat(90));
    console.log(`  ${"Email".padEnd(35)} ${"Name".padEnd(20)} ${"Role".padEnd(10)} ${"Active".padEnd(8)} Last Login`);
    console.log("  " + "-".repeat(90));
    for (const u of users) {
      const login = u.lastLoginAt ? u.lastLoginAt.toISOString().slice(0, 16) : "never";
      console.log(`  ${u.email.padEnd(35)} ${(u.name || "").padEnd(20)} ${u.role.padEnd(10)} ${(u.isActive ? "yes" : "no").padEnd(8)} ${login}`);
    }
    console.log("");
    return;
  }

  // Search by email (partial match)
  const users = await prisma.user.findMany({
    where: { OR: [{ email: { contains: search } }, { name: { contains: search } }] },
  });

  if (users.length === 0) { console.log(`No users matching: ${search}`); return; }

  for (const user of users) {
    console.log(`\n  User Details:`);
    console.log("  " + "-".repeat(40));
    console.log(`  ID:         ${user.id}`);
    console.log(`  Email:      ${user.email}`);
    console.log(`  Name:       ${user.name}`);
    console.log(`  Role:       ${user.role}`);
    console.log(`  Department: ${user.department || "(not set)"}`);
    console.log(`  Job Title:  ${user.jobTitle || "(not set)"}`);
    console.log(`  Active:     ${user.isActive ? "yes" : "no"}`);
    console.log(`  Azure AD:   ${user.azureAdId}`);
    console.log(`  Last Login: ${user.lastLoginAt ? user.lastLoginAt.toISOString() : "never"}`);
    console.log(`  Created:    ${user.createdAt.toISOString()}`);
    console.log("");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
