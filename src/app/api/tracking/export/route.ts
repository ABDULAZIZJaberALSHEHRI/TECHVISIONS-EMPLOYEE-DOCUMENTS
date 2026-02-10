import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isNextResponse } from "@/lib/auth-guard";
import { canViewTrackingMatrix, getAccessibleDepartments } from "@/lib/permissions";
import { createAuditLog, getClientIp } from "@/lib/audit";
import ExcelJS from "exceljs";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (isNextResponse(user)) return user;

    if (!canViewTrackingMatrix(user)) {
      return NextResponse.json(
        { success: false, error: "Not authorized to export tracking data" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department") || undefined;

    // Permission check
    if (department && !canViewTrackingMatrix(user, department)) {
      return NextResponse.json(
        { success: false, error: "Not authorized for this department" },
        { status: 403 }
      );
    }

    const employeeWhere: Record<string, unknown> = { isActive: true };
    const accessibleDepts = getAccessibleDepartments(user);

    if (department) {
      employeeWhere.department = department;
    } else if (accessibleDepts !== "ALL") {
      employeeWhere.department = { in: accessibleDepts };
    }

    // Get open requests
    const openRequests = await prisma.documentRequest.findMany({
      where: { status: "OPEN" },
      select: { id: true, title: true, deadline: true, priority: true },
      orderBy: { deadline: "asc" },
    });

    // Get employees with assignments
    const employees = await prisma.user.findMany({
      where: employeeWhere,
      select: {
        name: true,
        email: true,
        department: true,
        assignments: {
          where: { request: { status: "OPEN" } },
          select: {
            status: true,
            submittedAt: true,
            dueDate: true,
            requestId: true,
          },
        },
      },
      orderBy: [{ department: "asc" }, { name: "asc" }],
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "DRMS";
    workbook.created = new Date();

    // --- Sheet 1: Tracking Matrix ---
    const matrixSheet = workbook.addWorksheet("Tracking Matrix");

    // Headers
    const headers = ["Employee", "Email", "Department"];
    for (const req of openRequests) {
      headers.push(req.title);
    }
    matrixSheet.addRow(headers);

    // Style header
    const headerRow = matrixSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3B82F6" },
    };
    headerRow.alignment = { horizontal: "center", wrapText: true };

    // Data rows
    const now = new Date();
    for (const emp of employees) {
      const row: (string | undefined)[] = [emp.name, emp.email, emp.department || "N/A"];
      for (const req of openRequests) {
        const assignment = emp.assignments.find((a) => a.requestId === req.id);
        if (!assignment) {
          row.push("Not Assigned");
        } else if (assignment.status === "APPROVED") {
          row.push("Approved");
        } else if (assignment.status === "SUBMITTED") {
          row.push(`Submitted ${assignment.submittedAt ? format(assignment.submittedAt, "MM/dd") : ""}`);
        } else if (assignment.status === "REJECTED") {
          row.push("Rejected");
        } else if (assignment.dueDate < now) {
          row.push("OVERDUE");
        } else {
          row.push("Pending");
        }
      }
      const dataRow = matrixSheet.addRow(row);

      // Color-code status cells
      for (let col = 4; col <= 3 + openRequests.length; col++) {
        const cell = dataRow.getCell(col);
        const val = cell.value as string;
        if (val === "Approved") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4EDDA" } };
        } else if (val?.startsWith("Submitted")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
        } else if (val === "OVERDUE") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8D7DA" } };
          cell.font = { bold: true, color: { argb: "FFDC3545" } };
        } else if (val === "Rejected") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } };
        }
      }
    }

    // Auto-width columns
    matrixSheet.columns.forEach((col) => {
      col.width = 18;
    });
    if (matrixSheet.columns[0]) matrixSheet.columns[0].width = 25;
    if (matrixSheet.columns[1]) matrixSheet.columns[1].width = 30;

    // --- Sheet 2: Summary ---
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.addRow(["Metric", "Value"]);
    const summaryHeader = summarySheet.getRow(1);
    summaryHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
    summaryHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3B82F6" },
    };

    let total = 0;
    let completed = 0;
    let overdue = 0;
    for (const emp of employees) {
      for (const a of emp.assignments) {
        total++;
        if (a.status === "APPROVED" || a.status === "SUBMITTED") completed++;
        if (a.dueDate < now && a.status === "PENDING") overdue++;
      }
    }

    summarySheet.addRow(["Total Employees", employees.length]);
    summarySheet.addRow(["Total Assignments", total]);
    summarySheet.addRow(["Completed", completed]);
    summarySheet.addRow(["Overdue", overdue]);
    summarySheet.addRow(["Pending", total - completed - overdue]);
    summarySheet.addRow([
      "Completion Rate",
      total > 0 ? `${Math.round((completed / total) * 100)}%` : "N/A",
    ]);
    summarySheet.addRow(["Export Date", format(new Date(), "yyyy-MM-dd HH:mm")]);

    summarySheet.columns.forEach((col) => {
      col.width = 25;
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    await createAuditLog({
      userId: user.id,
      action: "EXPORT_TRACKING_MATRIX",
      entityType: "tracking",
      details: { department, employeeCount: employees.length },
      ipAddress: getClientIp(request),
    });

    const fileName = `tracking-matrix-${format(new Date(), "yyyy-MM-dd")}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/tracking/export error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export tracking data" },
      { status: 500 }
    );
  }
}
