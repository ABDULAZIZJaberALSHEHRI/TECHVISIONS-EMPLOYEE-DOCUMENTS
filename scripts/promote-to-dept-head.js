const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const department = process.argv[3];

  let user;

  if (email) {
    user = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (!user) {
      console.log(`\n  User not found: ${email}\n`);
      return;
    }
  } else {
    user = await prisma.user.findFirst({ orderBy: { createdAt: "desc" } });
    if (!user) {
      console.log("\n  No users in database. Sign in first.\n");
      return;
    }
  }

  const dept = department || user.department || "IT";

  await prisma.user.update({
    where: { id: user.id },
    data: {
      role: "DEPARTMENT_HEAD",
      managedDepartment: dept,
      department: user.department || dept,
    },
  });

  console.log(`\n  ${user.name} (${user.email})`);
  console.log(`  Role: ${user.role} -> DEPARTMENT_HEAD`);
  console.log(`  Manages department: ${dept}`);
  console.log("\n  Sign out and sign back in to apply.\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
