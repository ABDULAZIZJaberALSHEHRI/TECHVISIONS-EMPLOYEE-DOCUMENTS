import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isNextResponse } from "@/lib/auth-guard";
import ExcelJS from "exceljs";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["ADMIN", "HR"]);
    if (isNextResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    const where: Record<string, unknown> = {};
    if (requestId) where.id = requestId;

    const requests = await prisma.documentRequest.findMany({
      where,
      include: {
        category: { select: { name: true } },
        createdBy: { select: { name: true } },
        assignments: {
          include: {
            employee: { select: { name: true, email: true, department: true } },
            documents: {
              where: { isLatest: true },
              select: { fileName: true, createdAt: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Document Requests");

    sheet.columns = [
      { header: "Request Title", key: "title", width: 30 },
      { header: "Category", key: "category", width: 20 },
      { header: "Priority", key: "priority", width: 12 },
      { header: "Status", key: "status", width: 12 },
      { header: "Deadline", key: "deadline", width: 15 },
      { header: "Created By", key: "createdBy", width: 20 },
      { header: "Employee Name", key: "employeeName", width: 25 },
      { header: "Employee Email", key: "employeeEmail", width: 30 },
      { header: "Department", key: "department", width: 20 },
      { header: "Assignment Status", key: "assignmentStatus", width: 18 },
      { header: "Document", key: "document", width: 30 },
      { header: "Submitted At", key: "submittedAt", width: 20 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1B4F72" },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    for (const req of requests) {
      for (const assignment of req.assignments) {
        const latestDoc = assignment.documents[0];
        sheet.addRow({
          title: req.title,
          category: req.category?.name || "N/A",
          priority: req.priority,
          status: req.status,
          deadline: req.deadline.toISOString().split("T")[0],
          createdBy: req.createdBy.name,
          employeeName: assignment.employee.name,
          employeeEmail: assignment.employee.email,
          department: assignment.employee.department || "N/A",
          assignmentStatus: assignment.status,
          document: latestDoc?.fileName || "Not submitted",
          submittedAt: latestDoc?.createdAt
            ? latestDoc.createdAt.toISOString().split("T")[0]
            : "N/A",
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="drms_export_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("GET /api/requests/export error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export data" },
      { status: 500 }
    );
  }
}
