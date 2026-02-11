import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isNextResponse } from "@/lib/auth-guard";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { notifyNewRequest } from "@/lib/notifications";
import { saveAttachment, saveTemplateFile, validateTemplateFile } from "@/lib/upload";
import { canCreateRequestForDepartment, getAllowedTargetTypes } from "@/lib/permissions";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { z } from "zod";

const documentSlotSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  templateId: z.string().nullable().optional(),
});

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
  targetType: z.enum(["ALL_EMPLOYEES", "DEPARTMENT", "SPECIFIC"]).optional(),
  targetDepartments: z.array(z.string()).optional(),
  assignedToId: z.string().optional(),
  documentSlots: z.array(documentSlotSchema).min(1).max(5).optional(),
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
    } else if (user.role === "HR") {
      // My Requests = created only. Assigned requests live at /hr/assignments
      where.createdById = user.id;
    } else if (user.role === "DEPARTMENT_HEAD" && user.managedDepartment) {
      // Department heads see requests they created or that target their department
      where.OR = [
        { createdById: user.id },
        {
          assignments: {
            some: {
              employee: { department: user.managedDepartment },
            },
          },
        },
      ];
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      const searchFilter = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
      if (where.OR) {
        // Combine existing OR with search OR using AND
        where.AND = [{ OR: where.OR }, { OR: searchFilter }];
        delete where.OR;
      } else {
        where.OR = searchFilter;
      }
    }

    const [requests, total] = await Promise.all([
      prisma.documentRequest.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          documentSlots: { orderBy: { sortOrder: "asc" } },
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
    const user = await requireRole(["ADMIN", "HR", "DEPARTMENT_HEAD"]);
    if (isNextResponse(user)) return user;

    const contentType = request.headers.get("content-type") || "";
    let data: z.infer<typeof createRequestSchema>;
    let attachmentFiles: File[] = [];
    let templateFile: File | null = null;

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
        targetType: (formData.get("targetType") as "ALL_EMPLOYEES" | "DEPARTMENT" | "SPECIFIC") || undefined,
        assignedToId: (formData.get("assignedToId") as string) || undefined,
        targetDepartments: JSON.parse((formData.get("targetDepartments") as string) || "[]"),
        documentSlots: JSON.parse((formData.get("documentSlots") as string) || "[]"),
      };
      attachmentFiles = formData.getAll("attachments") as File[];
      const tpl = formData.get("templateFile");
      if (tpl && tpl instanceof File && tpl.size > 0) {
        templateFile = tpl;
      }
    } else {
      data = await request.json();
    }

    const parsed = createRequestSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      employeeIds,
      department,
      assignAll,
      targetType: rawTargetType,
      targetDepartments,
      documentSlots,
      assignedToId,
      ...requestData
    } = parsed.data;

    // Validate assignedToId permissions
    if (assignedToId) {
      if (user.role !== "ADMIN" && user.role !== "DEPARTMENT_HEAD" && user.role !== "HR") {
        return NextResponse.json(
          { success: false, error: "You cannot assign requests to HR users" },
          { status: 403 }
        );
      }
      const assignedToUser = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: { role: true, isActive: true },
      });
      if (!assignedToUser || assignedToUser.role !== "HR" || !assignedToUser.isActive) {
        return NextResponse.json(
          { success: false, error: "Invalid HR user for assignment" },
          { status: 400 }
        );
      }
    }

    // Determine target type - backward compatible
    const targetType = rawTargetType || (assignAll ? "ALL_EMPLOYEES" : department ? "DEPARTMENT" : "SPECIFIC");

    // Permission check for target type
    const allowedTypes = getAllowedTargetTypes(user);
    if (!allowedTypes.includes(targetType)) {
      return NextResponse.json(
        { success: false, error: "You are not allowed to use this target type" },
        { status: 403 }
      );
    }

    // DEPARTMENT_HEAD permission check for department targeting
    if (user.role === "DEPARTMENT_HEAD") {
      if (targetType === "DEPARTMENT" && targetDepartments && targetDepartments.length > 0) {
        for (const dept of targetDepartments) {
          if (!canCreateRequestForDepartment(user, dept)) {
            return NextResponse.json(
              { success: false, error: `You can only create requests for your department (${user.managedDepartment})` },
              { status: 403 }
            );
          }
        }
      } else if (targetType === "SPECIFIC") {
        // Verify selected employees are in their department
        if (employeeIds && employeeIds.length > 0) {
          const employees = await prisma.user.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, department: true },
          });
          const outsideDept = employees.filter((e) => e.department !== user.managedDepartment);
          if (outsideDept.length > 0) {
            return NextResponse.json(
              { success: false, error: "You can only assign requests to employees in your department" },
              { status: 403 }
            );
          }
        }
      }
    }

    // Validate template file
    if (templateFile) {
      const validationError = validateTemplateFile(templateFile);
      if (validationError) {
        return NextResponse.json(
          { success: false, error: validationError },
          { status: 400 }
        );
      }
    }

    // Resolve target employees
    let targetEmployeeIds: string[] = employeeIds || [];

    if (targetType === "ALL_EMPLOYEES") {
      const employees = await prisma.user.findMany({
        where: { isActive: true, role: { not: "ADMIN" } },
        select: { id: true },
      });
      targetEmployeeIds = employees.map((e) => e.id);
    } else if (targetType === "DEPARTMENT") {
      const depts = targetDepartments && targetDepartments.length > 0
        ? targetDepartments
        : department
          ? [department]
          : [];

      if (depts.length === 0) {
        return NextResponse.json(
          { success: false, error: "At least one department is required for department targeting" },
          { status: 400 }
        );
      }

      const employees = await prisma.user.findMany({
        where: { isActive: true, department: { in: depts } },
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

    // Auto-assign HR users to their own requests
    const effectiveAssignedToId = assignedToId || (user.role === "HR" ? user.id : null);

    console.log("REQUEST CREATION:", {
      createdById: user.id,
      assignedToId: effectiveAssignedToId,
      selfAssigned: effectiveAssignedToId === user.id,
    });

    const result = await prisma.$transaction(async (tx) => {
      const docRequest = await tx.documentRequest.create({
        data: {
          title: requestData.title,
          description: requestData.description,
          categoryId: requestData.categoryId || null,
          createdById: user.id,
          assignedToId: effectiveAssignedToId,
          status: effectiveAssignedToId ? "PENDING_HR" : "OPEN",
          deadline: new Date(requestData.deadline),
          priority: requestData.priority,
          acceptedFormats: requestData.acceptedFormats || null,
          maxFileSizeMb: requestData.maxFileSizeMb || 10,
          notes: requestData.notes || null,
          targetType,
          targetDepartments: targetDepartments && targetDepartments.length > 0
            ? JSON.stringify(targetDepartments)
            : department
              ? JSON.stringify([department])
              : null,
        },
      });

      await tx.requestAssignment.createMany({
        data: targetEmployeeIds.map((empId) => ({
          requestId: docRequest.id,
          employeeId: empId,
          dueDate: new Date(requestData.deadline),
        })),
      });

      // Create document slots if provided
      if (documentSlots && documentSlots.length > 0) {
        await tx.documentSlot.createMany({
          data: documentSlots.map((slot, index) => ({
            requestId: docRequest.id,
            name: slot.name,
            templateId: slot.templateId || null,
            sortOrder: index,
          })),
        });
      }

      return docRequest;
    });

    // Save template file outside transaction
    if (templateFile) {
      const saved = await saveTemplateFile(templateFile, result.id);
      await prisma.documentRequest.update({
        where: { id: result.id },
        data: {
          templateUrl: saved.filePath,
          templateName: saved.fileName,
        },
      });
    }

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

    // Notify assigned HR user (skip if they assigned themselves)
    if (effectiveAssignedToId && effectiveAssignedToId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: effectiveAssignedToId,
          type: "NEW_REQUEST",
          title: "New Request Assigned to You",
          message: `You have been assigned to process: "${result.title}"`,
          link: `/hr/requests/${result.id}`,
        },
      });
    }

    await createAuditLog({
      userId: user.id,
      action: "CREATE_REQUEST",
      entityType: "request",
      entityId: result.id,
      details: {
        title: result.title,
        targetType,
        assignedToId: effectiveAssignedToId,
        assignedCount: targetEmployeeIds.length,
        hasTemplate: !!templateFile,
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
