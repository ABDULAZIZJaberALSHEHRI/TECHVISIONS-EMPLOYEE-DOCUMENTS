const { PrismaClient } = require("@prisma/client");
const readline = require("readline");
const prisma = new PrismaClient();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { email: true, name: true, role: true, isActive: true },
  });
  if (users.length === 0) { console.log("\n  No users found.\n"); return; }
  console.log(`\n  All Users (${users.length}):`);
  console.log("  " + "-".repeat(75));
  console.log(`  ${"#".padEnd(4)} ${"Email".padEnd(35)} ${"Name".padEnd(20)} ${"Role".padEnd(10)}`);
  console.log("  " + "-".repeat(75));
  users.forEach((u, i) => {
    console.log(`  ${String(i + 1).padEnd(4)} ${u.email.padEnd(35)} ${(u.name || "").padEnd(20)} ${u.role.padEnd(10)}`);
  });
  console.log("");
}

async function changeRole(targetRole) {
  const email = await ask(`  Enter email: `);
  const user = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!user) { console.log(`  User not found: ${email}\n`); return; }

  console.log(`  ${user.name} (${user.email}): ${user.role} -> ${targetRole}`);
  await prisma.user.update({ where: { id: user.id }, data: { role: targetRole } });
  console.log(`  Done! Sign out and sign back in to apply.\n`);
}

async function main() {
  while (true) {
    console.log("\n  ============================");
    console.log("  DRMS - User Role Management");
    console.log("  ============================");
    console.log("  1. List all users");
    console.log("  2. Promote to ADMIN");
    console.log("  3. Promote to HR");
    console.log("  4. Demote to EMPLOYEE");
    console.log("  5. Exit");
    console.log("");

    const choice = await ask("  Choose (1-5): ");

    switch (choice.trim()) {
      case "1": await listUsers(); break;
      case "2": await changeRole("ADMIN"); break;
      case "3": await changeRole("HR"); break;
      case "4": await changeRole("EMPLOYEE"); break;
      case "5": console.log(""); rl.close(); return;
      default: console.log("  Invalid choice.\n");
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
