const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  // Check schema fields exist
  const user = await p.user.findFirst();
  console.log("=== User Schema Check ===");
  console.log("Has managedDepartment field:", "managedDepartment" in user);
  console.log("User:", user.name, "| Role:", user.role, "| Dept:", user.department, "| ManagedDept:", user.managedDepartment);

  // Check DocumentRequest schema
  const req = await p.documentRequest.findFirst();
  if (req) {
    console.log("\n=== DocumentRequest Schema Check ===");
    console.log("Has templateUrl:", "templateUrl" in req);
    console.log("Has targetType:", "targetType" in req);
    console.log("Has targetDepartments:", "targetDepartments" in req);
    console.log("targetType value:", req.targetType);
  }

  // Check RequestAssignment schema
  const assign = await p.requestAssignment.findFirst();
  if (assign) {
    console.log("\n=== Assignment Schema Check ===");
    console.log("Has submittedAt:", "submittedAt" in assign);
    console.log("Has reminderCount:", "reminderCount" in assign);
  }

  // Check enum values via raw query
  console.log("\n=== Enum Check ===");
  const roles = await p.$queryRaw`SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='role'`;
  console.log("Role enum:", roles[0].COLUMN_TYPE);

  const tt = await p.$queryRaw`SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='document_requests' AND COLUMN_NAME='target_type'`;
  console.log("TargetType enum:", tt[0].COLUMN_TYPE);

  // Count data
  console.log("\n=== Data Counts ===");
  const userCount = await p.user.count();
  const reqCount = await p.documentRequest.count();
  const assignCount = await p.requestAssignment.count();
  const catCount = await p.category.count();
  console.log("Users:", userCount, "| Requests:", reqCount, "| Assignments:", assignCount, "| Categories:", catCount);
}

main().catch(console.error).finally(() => p.$disconnect());
