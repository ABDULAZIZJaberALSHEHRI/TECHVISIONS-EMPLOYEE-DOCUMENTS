import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isNextResponse } from "@/lib/auth-guard";
import { canAccessRequest } from "@/lib/permissions";
import { createAuditLog, getClientIp } from "@/lib/audit";
import {
  deleteFile,
  deleteTemplateFile,
  saveTemplateFile,
  validateTemplateFile,
  saveAttachment,
} from "@/lib/upload";
import { deletePrefix } from "@/lib/storage";
import { z } from "zod";

const documentSlotSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  templateId: z.string().nullable().optional(),
});

const updateRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["OPEN", "PENDING_HR", "CLOSED", "CANCELLED"]).optional(),
  assignedToId: z.string().nullable().optional(),
  acceptedFormats: z.string().optional(),
  maxFileSizeMb: z.number().min(1).max(100).optional(),
  notes: z.string().optional(),
  documentSlots: z.array(documentSlotSchema).min(1).max(5).optional(),
  employeeIds: z.array(z.string()).optional(),
  removedAttachmentIds: z.array(z.string()).optional(),
  removeTemplate: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (isNextResponse(user)) return user;
    const docRequest = await prisma.documentRequest.findUnique({
      where: { id },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        documentSlots: { orderBy: { sortOrder: "asc" } },
        attachments: true,
        assignments: {
          include: {
            employee: {
              select: { id: true, name: true, email: true, department: true },
            },
            reviewedBy: { select: { id: true, name: true } },
            documents: {
              where: { isLatest: true },
              select: {
                id: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                note: true,
                version: true,
                createdAt: true,
              },
            },
          },
          orderBy: { employee: { name: "asc" } },
        },
      },
    });
    if (!docRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    // Unified access check: creator, HR processor, employee target, or ADMIN
    const employeeTargetIds = docRequest.assignments.map((a) => a.employee.id);
    const hasAccess = canAccessRequest(user, {
      createdById: docRequest.createdById,
      assignedToId: docRequest.assignedToId,
      employeeTargetIds,
    });

    // DEPARTMENT_HEAD can also access if they have employees in their department
    const deptHeadAccess =
      user.role === "DEPARTMENT_HEAD" &&
      docRequest.assignments.some(
        (a) => a.employee.department === user.managedDepartment
      );

    if (!hasAccess && !deptHeadAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // DEPARTMENT_HEAD: filter assignments to their department only (unless creator)
    if (user.role === "DEPARTMENT_HEAD" && docRequest.createdById !== user.id) {
      docRequest.assignments = docRequest.assignments.filter(
        (a) => a.employee.department === user.managedDepartment
      );
    }

    return NextResponse.json({ success: true, data: docRequest });
  } catch (error) {
    console.error("GET /api/requests/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch request" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole(["ADMIN", "HR", "DEPARTMENT_HEAD"]);
    if (isNextResponse(user)) return user;

    // Parse body — support both JSON and FormData
    const contentType = request.headers.get("content-type") || "";
    let bodyData: Record<string, unknown>;
    let newTemplateFile: File | null = null;
    let newAttachmentFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      bodyData = {
        title: formData.get("title") as string || undefined,
        description: formData.get("description") as string || undefined,
        categoryId: formData.has("categoryId")
          ? (formData.get("categoryId") as string) || null
          : undefined,
        deadline: formData.get("deadline") as string || undefined,
        priority: formData.get("priority") as string || undefined,
        acceptedFormats: formData.get("acceptedFormats") as string || undefined,
        maxFileSizeMb: formData.get("maxFileSizeMb")
          ? parseInt(formData.get("maxFileSizeMb") as string)
          : undefined,
        notes: formData.has("notes")
          ? (formData.get("notes") as string) || ""
          : undefined,
        status: formData.get("status") as string || undefined,
        assignedToId: formData.has("assignedToId")
          ? (formData.get("assignedToId") as string) || null
          : undefined,
        documentSlots: formData.has("documentSlots")
          ? JSON.parse(formData.get("documentSlots") as string)
          : undefined,
        employeeIds: formData.has("employeeIds")
          ? JSON.parse(formData.get("employeeIds") as string)
          : undefined,
        removedAttachmentIds: formData.has("removedAttachmentIds")
          ? JSON.parse(formData.get("removedAttachmentIds") as string)
          : undefined,
        removeTemplate: formData.get("removeTemplate") === "true" || undefined,
      };

      // Clean undefined values
      Object.keys(bodyData).forEach((key) => {
        if (bodyData[key] === undefined) delete bodyData[key];
      });

      // Extract files
      const tpl = formData.get("templateFile");
      if (tpl && tpl instanceof File && tpl.size > 0) {
        newTemplateFile = tpl;
      }
      newAttachmentFiles = (formData.getAll("attachments") as File[]).filter(
        (f) => f instanceof File && f.size > 0
      );
    } else {
      bodyData = await request.json();
    }

    const parsed = updateRequestSchema.safeParse(bodyData);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.documentRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    // HR can update requests they created or are assigned to, but cannot reassign
    if (user.role === "HR") {
      if (existing.createdById !== user.id && existing.assignedToId !== user.id) {
        return NextResponse.json(
          { success: false, error: "You can only update your own requests" },
          { status: 403 }
        );
      }
      if (parsed.data.assignedToId !== undefined) {
        return NextResponse.json(
          { success: false, error: "HR users cannot reassign requests" },
          { status: 403 }
        );
      }
    }

    // DEPARTMENT_HEAD can only update their own requests
    if (user.role === "DEPARTMENT_HEAD" && existing.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only update your own requests" },
        { status: 403 }
      );
    }

    // Validate assignedToId change
    if (parsed.data.assignedToId !== undefined && parsed.data.assignedToId !== null) {
      const targetUser = await prisma.user.findUnique({
        where: { id: parsed.data.assignedToId },
        select: { role: true, isActive: true },
      });
      if (!targetUser || targetUser.role !== "HR" || !targetUser.isActive) {
        return NextResponse.json(
          { success: false, error: "Invalid HR user for assignment" },
          { status: 400 }
        );
      }
    }

    // Validate template file if uploading new one
    if (newTemplateFile) {
      const validationError = validateTemplateFile(newTemplateFile);
      if (validationError) {
        return NextResponse.json(
          { success: false, error: validationError },
          { status: 400 }
        );
      }
    }

    const { documentSlots, employeeIds, removedAttachmentIds, removeTemplate, ...restData } = parsed.data;
    const updateData: Record<string, unknown> = { ...restData };
    if (restData.deadline) {
      updateData.deadline = new Date(restData.deadline);
    }

    const updated = await prisma.documentRequest.update({
      where: { id },
      data: updateData,
    });

    // Update document slots if provided (replace all)
    if (documentSlots) {
      await prisma.documentSlot.deleteMany({ where: { requestId: id } });
      if (documentSlots.length > 0) {
        await prisma.documentSlot.createMany({
          data: documentSlots.map((slot, index) => ({
            requestId: id,
            name: slot.name,
            templateId: slot.templateId || null,
            sortOrder: index,
          })),
        });
      }
    }

    // If deadline changed, update all assignment due dates
    if (parsed.data.deadline) {
      await prisma.requestAssignment.updateMany({
        where: { requestId: id },
        data: { dueDate: new Date(parsed.data.deadline) },
      });
    }

    // Handle employee assignment changes
    if (employeeIds !== undefined) {
      const currentAssignments = await prisma.requestAssignment.findMany({
        where: { requestId: id },
        include: {
          documents: { select: { id: true, filePath: true } },
        },
      });
      const currentEmployeeIds = currentAssignments.map((a) => a.employeeId);

      const addedIds = employeeIds.filter((eid: string) => !currentEmployeeIds.includes(eid));
      const removedIds = currentEmployeeIds.filter((eid) => !employeeIds.includes(eid));

      // Remove assignments for removed employees (delete their files from storage first)
      if (removedIds.length > 0) {
        const assignmentsToRemove = currentAssignments.filter((a) =>
          removedIds.includes(a.employeeId)
        );
        for (const assignment of assignmentsToRemove) {
          for (const doc of assignment.documents) {
            await deleteFile(doc.filePath);
          }
        }
        await prisma.requestAssignment.deleteMany({
          where: {
            requestId: id,
            employeeId: { in: removedIds },
          },
        });
      }

      // Add new assignments
      if (addedIds.length > 0) {
        const deadline = parsed.data.deadline
          ? new Date(parsed.data.deadline)
          : existing.deadline;

        await prisma.requestAssignment.createMany({
          data: addedIds.map((employeeId: string) => ({
            requestId: id,
            employeeId,
            status: "PENDING" as const,
            dueDate: deadline,
          })),
        });

        // Notify newly added employees
        await prisma.notification.createMany({
          data: addedIds.map((employeeId: string) => ({
            userId: employeeId,
            type: "NEW_REQUEST" as const,
            title: "New Document Request",
            message: `You have been assigned to the document request "${updated.title}".`,
            link: `/employee/requests`,
          })),
        });
      }
    }

    // Handle template changes
    if (removeTemplate && !newTemplateFile) {
      await deleteTemplateFile(id);
      await prisma.documentRequest.update({
        where: { id },
        data: { templateUrl: null, templateName: null },
      });
    }
    if (newTemplateFile) {
      // Delete old template first
      if (existing.templateUrl) {
        await deleteTemplateFile(id);
      }
      const saved = await saveTemplateFile(newTemplateFile, id);
      await prisma.documentRequest.update({
        where: { id },
        data: { templateUrl: saved.filePath, templateName: saved.fileName },
      });
    }

    // Handle attachment removals
    if (removedAttachmentIds && removedAttachmentIds.length > 0) {
      const attachmentsToRemove = await prisma.requestAttachment.findMany({
        where: { id: { in: removedAttachmentIds }, requestId: id },
      });
      for (const att of attachmentsToRemove) {
        await deleteFile(att.filePath);
      }
      await prisma.requestAttachment.deleteMany({
        where: { id: { in: removedAttachmentIds }, requestId: id },
      });
    }

    // Handle new attachment uploads
    if (newAttachmentFiles.length > 0) {
      for (const file of newAttachmentFiles) {
        const saved = await saveAttachment(file, id);
        await prisma.requestAttachment.create({
          data: {
            requestId: id,
            fileName: saved.fileName,
            filePath: saved.filePath,
            fileSize: saved.fileSize,
            mimeType: saved.mimeType,
          },
        });
      }
    }

    // If request cancelled, notify employees
    if (parsed.data.status === "CANCELLED") {
      const assignments = await prisma.requestAssignment.findMany({
        where: { requestId: id },
        select: { employeeId: true },
      });

      await prisma.notification.createMany({
        data: assignments.map((a) => ({
          userId: a.employeeId,
          type: "REQUEST_CANCELLED" as const,
          title: "Request Cancelled",
          message: `The document request "${updated.title}" has been cancelled.`,
          link: null,
        })),
      });
    }

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_REQUEST",
      entityType: "request",
      entityId: id,
      details: parsed.data,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/requests/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update request" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole(["ADMIN", "HR", "DEPARTMENT_HEAD"]);
    if (isNextResponse(user)) return user;

    const existing = await prisma.documentRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    // Only creator or ADMIN can delete
    if (user.role !== "ADMIN" && existing.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: "Only the request creator can delete this request" },
        { status: 403 }
      );
    }

    // Clean up storage files before DB cascade deletion

    // 1. Delete all uploaded documents (employee submissions)
    const documents = await prisma.document.findMany({
      where: { assignment: { requestId: id } },
      select: { filePath: true },
    });
    for (const doc of documents) {
      await deleteFile(doc.filePath);
    }

    // 2. Delete all request attachments
    const attachments = await prisma.requestAttachment.findMany({
      where: { requestId: id },
      select: { filePath: true },
    });
    for (const att of attachments) {
      await deleteFile(att.filePath);
    }

    // 3. Delete template files
    await deleteTemplateFile(id);

    // 4. Cleanup any remaining files in the request directory
    await deletePrefix(`${id}/`);

    // Notify all assigned employees about deletion
    const assignments = await prisma.requestAssignment.findMany({
      where: { requestId: id },
      select: { employeeId: true },
    });

    if (assignments.length > 0) {
      await prisma.notification.createMany({
        data: assignments.map((a) => ({
          userId: a.employeeId,
          type: "REQUEST_CANCELLED" as const,
          title: "Request Deleted",
          message: `The document request "${existing.title}" has been deleted.`,
          link: null,
        })),
      });
    }

    // Cascade delete: assignments → documents, documentSlots, attachments
    await prisma.documentRequest.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE_REQUEST",
      entityType: "request",
      entityId: id,
      details: { title: existing.title },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, message: "Request deleted" });
  } catch (error) {
    console.error("DELETE /api/requests/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete request" },
      { status: 500 }
    );
  }
}
