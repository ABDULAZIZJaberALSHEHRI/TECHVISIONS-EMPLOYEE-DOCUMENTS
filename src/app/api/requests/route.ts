import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isNextResponse } from "@/lib/auth-guard";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { notifyNewRequest } from "@/lib/notifications";
import { saveAttachment } from "@/lib/upload";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { z } from "zod";

const createRequestSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required"),
  categoryId: z.string().nullable().optional(),
  deadline: z.string().min(1, "Deadline is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  acceptedFormats: z.string().optional(),
  maxFileSizeMb: z.number().min(1).max(100).optional(),
  notes: z.string().optional(),
  employeeIds: z.array(z.string()).optional(),
  department: z.string().nullable().optional(),
  assignAll: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || String(ITEMS_PER_PAGE));
    const status = searchParams.get("status") || "";
    const priority = searchParams.get("priority") || "";
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";

    const where: Record<string, unknown> = {};

    if (user.role === "EMPLOYEE") {
      where.assignments = { some: { employeeId: user.id } };
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [requests, total] = await Promise.all([
      prisma.documentRequest.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { assignments: true, attachments: true } },
          assignments: user.role === "EMPLOYEE"
            ? {
                where: { employeeId: user.id },
                select: { id: true, status: true },
              }
            : {
                select: { id: true, status: true },
              },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.documentRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: requests,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("GET /api/requests error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["ADMIN", "HR"]);
    if (isNextResponse(user)) return user;

    const contentType = request.headers.get("content-type") || "";
    let data: z.infer<typeof createRequestSchema>;
    let attachmentFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      data = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        categoryId: (formData.get("categoryId") as string) || null,
        deadline: formData.get("deadline") as string,
        priority: formData.get("priority") as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
        acceptedFormats: (formData.get("acceptedFormats") as string) || undefined,
        maxFileSizeMb: formData.get("maxFileSizeMb")
          ? parseInt(formData.get("maxFileSizeMb") as string)
          : undefined,
        notes: (formData.get("notes") as string) || undefined,
        employeeIds: JSON.parse((formData.get("employeeIds") as string) || "[]"),
        department: (formData.get("department") as string) || null,
        assignAll: formData.get("assignAll") === "true",
      };
      attachmentFiles = formData.getAll("attachments") as File[];
    } else {
      data = await request.json();
    }

    const parsed = createRequestSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { employeeIds, department, assignAll, ...requestData } = parsed.data;

    let targetEmployeeIds: string[] = employeeIds || [];

    if (assignAll) {
      const employees = await prisma.user.findMany({
        where: { role: "EMPLOYEE", isActive: true },
        select: { id: true },
      });
      targetEmployeeIds = employees.map((e) => e.id);
    } else if (department) {
      const employees = await prisma.user.findMany({
        where: { role: "EMPLOYEE", isActive: true, department },
        select: { id: true },
      });
      targetEmployeeIds = employees.map((e) => e.id);
    }

    if (targetEmployeeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No employees selected for assignment" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const docRequest = await tx.documentRequest.create({
        data: {
          title: requestData.title,
          description: requestData.description,
          categoryId: requestData.categoryId || null,
          createdById: user.id,
          deadline: new Date(requestData.deadline),
          priority: requestData.priority,
          acceptedFormats: requestData.acceptedFormats || null,
          maxFileSizeMb: requestData.maxFileSizeMb || 10,
          notes: requestData.notes || null,
        },
      });

      await tx.requestAssignment.createMany({
        data: targetEmployeeIds.map((empId) => ({
          requestId: docRequest.id,
          employeeId: empId,
          dueDate: new Date(requestData.deadline),
        })),
      });

      return docRequest;
    });

    // Save attachments outside transaction
    for (const file of attachmentFiles) {
      const saved = await saveAttachment(file, result.id);
      await prisma.requestAttachment.create({
        data: {
          requestId: result.id,
          fileName: saved.fileName,
          filePath: saved.filePath,
          fileSize: saved.fileSize,
          mimeType: saved.mimeType,
        },
      });
    }

    // Notify employees asynchronously
    const employees = await prisma.user.findMany({
      where: { id: { in: targetEmployeeIds } },
      select: { id: true, name: true, email: true },
    });

    for (const emp of employees) {
      notifyNewRequest(
        emp.id,
        emp.name,
        emp.email,
        result.title,
        new Date(parsed.data.deadline),
        result.id
      ).catch((err) => console.error("Notification failed:", err));
    }

    await createAuditLog({
      userId: user.id,
      action: "CREATE_REQUEST",
      entityType: "request",
      entityId: result.id,
      details: {
        title: result.title,
        assignedCount: targetEmployeeIds.length,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error("POST /api/requests error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create request" },
      { status: 500 }
    );
  }
}
