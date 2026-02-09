const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("\n  Seeding DRMS test data...\n");

  // ------------------------------------------------------------------
  // 1. Categories
  // ------------------------------------------------------------------
  const categoryData = [
    { name: "Employment Documents", description: "Employment contracts, offer letters, and related documents" },
    { name: "Identification", description: "National ID, passport copies, and residence permits" },
    { name: "Educational Certificates", description: "Degrees, diplomas, transcripts, and training certificates" },
    { name: "Financial Documents", description: "Bank details, salary certificates, and tax documents" },
    { name: "Medical Records", description: "Health insurance, medical reports, and fitness certificates" },
    { name: "Travel Documents", description: "Visa copies, travel requests, and flight bookings" },
    { name: "Performance Reviews", description: "Annual reviews, KPIs, and evaluation forms" },
    { name: "Training & Certifications", description: "Professional certifications and training completion records" },
  ];

  let categoriesCreated = 0;
  for (const cat of categoryData) {
    const exists = await prisma.category.findUnique({ where: { name: cat.name } });
    if (!exists) {
      await prisma.category.create({ data: cat });
      categoriesCreated++;
    }
  }
  console.log(`  Categories: ${categoriesCreated} created (${categoryData.length - categoriesCreated} already existed)`);

  // ------------------------------------------------------------------
  // 2. Ensure we have at least one user to be the request creator
  // ------------------------------------------------------------------
  let creator = await prisma.user.findFirst({ where: { role: { in: ["ADMIN", "HR"] } } });
  if (!creator) {
    creator = await prisma.user.findFirst();
  }
  if (!creator) {
    console.log("  No users in database. Sign in via Azure AD first, then re-run.");
    return;
  }
  console.log(`  Using "${creator.name}" (${creator.role}) as request creator`);

  // Get all users for assignments
  const allUsers = await prisma.user.findMany({ where: { isActive: true } });
  const categories = await prisma.category.findMany({ where: { isActive: true } });

  // ------------------------------------------------------------------
  // 3. Document Requests
  // ------------------------------------------------------------------
  const existingRequests = await prisma.documentRequest.count();
  if (existingRequests > 0) {
    console.log(`  Requests: ${existingRequests} already exist, skipping creation`);
  } else {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const requestData = [
      { title: "Submit Updated National ID", description: "All employees must submit a copy of their updated national ID or Iqama.", priority: "HIGH", deadline: new Date(now.getTime() + 7 * day), status: "OPEN" },
      { title: "Annual Health Insurance Form", description: "Please fill out and submit the annual health insurance enrollment form for the upcoming year.", priority: "MEDIUM", deadline: new Date(now.getTime() + 14 * day), status: "OPEN" },
      { title: "Emergency Contact Update", description: "Update your emergency contact information for company records.", priority: "LOW", deadline: new Date(now.getTime() + 30 * day), status: "OPEN" },
      { title: "Q4 Performance Self-Assessment", description: "Complete and submit your Q4 self-assessment form. Include achievements, goals met, and areas for improvement.", priority: "HIGH", deadline: new Date(now.getTime() + 5 * day), status: "OPEN" },
      { title: "Training Certificate Upload", description: "Upload certificates for any professional training completed this quarter.", priority: "LOW", deadline: new Date(now.getTime() + 21 * day), status: "OPEN" },
      { title: "Bank Account Verification", description: "Provide updated bank account details for payroll processing.", priority: "URGENT", deadline: new Date(now.getTime() + 3 * day), status: "OPEN" },
      { title: "Work From Home Agreement", description: "Sign and submit the updated WFH policy agreement.", priority: "MEDIUM", deadline: new Date(now.getTime() + 10 * day), status: "OPEN" },
      { title: "Passport Copy for Visa Processing", description: "Submit a clear copy of your passport bio page for upcoming business visa applications.", priority: "HIGH", deadline: new Date(now.getTime() + 7 * day), status: "OPEN" },
      { title: "IT Equipment Return Form", description: "Complete the equipment return form for any company devices being replaced.", priority: "LOW", deadline: new Date(now.getTime() + 14 * day), status: "CLOSED" },
      { title: "Annual Leave Balance Confirmation", description: "Review and confirm your annual leave balance for the current year.", priority: "MEDIUM", deadline: new Date(now.getTime() - 5 * day), status: "CLOSED" },
    ];

    let requestsCreated = 0;
    for (const req of requestData) {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const request = await prisma.documentRequest.create({
        data: {
          title: req.title,
          description: req.description,
          priority: req.priority,
          deadline: req.deadline,
          status: req.status,
          categoryId: cat?.id,
          createdById: creator.id,
          maxFileSizeMb: 25,
        },
      });

      // Create assignments for each user
      for (const user of allUsers) {
        const dueDate = new Date(req.deadline.getTime() - 2 * day);
        let assignStatus = "PENDING";
        if (req.status === "CLOSED") assignStatus = "APPROVED";
        if (req.deadline < now && req.status === "OPEN") assignStatus = "OVERDUE";

        await prisma.requestAssignment.create({
          data: {
            requestId: request.id,
            employeeId: user.id,
            dueDate,
            status: assignStatus,
          },
        });
      }
      requestsCreated++;
    }
    console.log(`  Requests: ${requestsCreated} created with assignments for ${allUsers.length} user(s)`);
  }

  // ------------------------------------------------------------------
  // 4. System Settings (defaults)
  // ------------------------------------------------------------------
  const defaultSettings = [
    { key: "reminder_days_before", value: "3,1" },
    { key: "app_name", value: "TechVisions DRMS" },
    { key: "max_file_size_mb", value: "25" },
  ];

  let settingsCreated = 0;
  for (const setting of defaultSettings) {
    const exists = await prisma.systemSetting.findUnique({ where: { key: setting.key } });
    if (!exists) {
      await prisma.systemSetting.create({ data: setting });
      settingsCreated++;
    }
  }
  console.log(`  Settings: ${settingsCreated} created`);

  // ------------------------------------------------------------------
  // 5. Summary
  // ------------------------------------------------------------------
  console.log("\n  Seed complete! Run 'npm run db:info' to see database status.\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
