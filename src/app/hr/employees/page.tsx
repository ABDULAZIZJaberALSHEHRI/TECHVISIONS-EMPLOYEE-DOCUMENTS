"use client";

import { useState, useEffect, useCallback } from "react";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import { useDebounce } from "@/hooks/useDebounce";

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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search, 300);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "10");
    if (debouncedSearch) params.set("search", debouncedSearch);

    try {
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1B4F72]">Employees</h1>
      <EmployeeTable
        employees={employees}
        total={total}
        page={page}
        pageSize={10}
        loading={loading}
        onPageChange={setPage}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
      />
    </div>
  );
}
