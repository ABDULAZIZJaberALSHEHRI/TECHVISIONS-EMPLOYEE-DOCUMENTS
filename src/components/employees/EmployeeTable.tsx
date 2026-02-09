"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { getInitials } from "@/lib/utils";
import { format } from "date-fns";

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string | null;
  jobTitle: string | null;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface EmployeeTableProps {
  employees: Employee[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
}

export function EmployeeTable({
  employees,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onSearch,
}: EmployeeTableProps) {
  const router = useRouter();

  const columns: Column<Employee>[] = [
    {
      key: "name",
      header: "Employee",
      render: (emp) => (
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => router.push(`/hr/employees/${emp.id}`)}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={emp.avatarUrl || undefined} />
            <AvatarFallback className="bg-[#1B4F72] text-white text-xs">
              {getInitials(emp.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium hover:underline">{emp.name}</p>
            <p className="text-xs text-muted-foreground">{emp.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (emp) => (
        <span className="text-sm">{emp.department || "—"}</span>
      ),
    },
    {
      key: "jobTitle",
      header: "Job Title",
      render: (emp) => (
        <span className="text-sm">{emp.jobTitle || "—"}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (emp) => (
        <Badge variant="secondary" className="text-xs">
          {emp.role}
        </Badge>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (emp) => (
        <Badge
          variant="secondary"
          className={
            emp.isActive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }
        >
          {emp.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      render: (emp) => (
        <span className="text-xs text-muted-foreground">
          {emp.lastLoginAt
            ? format(new Date(emp.lastLoginAt), "MMM dd, yyyy")
            : "Never"}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={employees}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onSearch={onSearch}
      searchPlaceholder="Search employees..."
      loading={loading}
      emptyTitle="No employees found"
      emptyDescription="No employees match your search criteria."
    />
  );
}
