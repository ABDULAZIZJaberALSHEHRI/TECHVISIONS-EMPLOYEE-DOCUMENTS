const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    const latest = await prisma.user.findFirst({ orderBy: { lastLoginAt: "desc" } });
    if (!latest) { console.log("No users found in database."); return; }
    console.log(`\nNo email provided. Demoting most recent user:`);
    console.log(`  ${latest.name} (${latest.email}) - currently: ${latest.role}`);
    await prisma.user.update({ where: { id: latest.id }, data: { role: "EMPLOYEE" } });
    console.log(`\n  ✓ Role changed to: EMPLOYEE`);
    console.log(`\n  Sign out and sign back in to apply.\n`);
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) { console.log(`User not found: ${email}`); return; }

  console.log(`\n  ${user.name} (${user.email}) - currently: ${user.role}`);
  await prisma.user.update({ where: { id: user.id }, data: { role: "EMPLOYEE" } });
  console.log(`  ✓ Role changed to: EMPLOYEE`);
  console.log(`\n  Sign out and sign back in to apply.\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
