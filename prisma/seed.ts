import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      azureAdId: "seed-admin-001",
      email: "admin@company.com",
      name: "System Admin",
      role: "ADMIN",
      isActive: true,
      department: "IT",
      jobTitle: "System Administrator",
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create document categories
  const categories = [
    { name: "Identity Documents", description: "National ID, passport, visa, residency permits" },
    { name: "Employment Documents", description: "Offer letters, contracts, certificates of employment" },
    { name: "Financial Documents", description: "Bank statements, tax documents, salary certificates" },
    { name: "Certifications & Licenses", description: "Professional certifications, trade licenses, permits" },
    { name: "Medical Documents", description: "Medical reports, insurance cards, fitness certificates" },
    { name: "Legal Documents", description: "Power of attorney, court documents, notarized documents" },
    { name: "Other", description: "Miscellaneous documents" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log(`Created ${categories.length} categories`);

  // Create system settings
  const settings = [
    { key: "reminder_days_before", value: "3,1" },
    { key: "max_file_size_mb", value: "10" },
    { key: "accepted_formats", value: "pdf,jpg,jpeg,png,doc,docx" },
    { key: "company_name", value: "Your Company" },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`Created ${settings.length} system settings`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
