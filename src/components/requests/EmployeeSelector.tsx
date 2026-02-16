"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string | null;
}

interface EmployeeSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  departmentFilter?: string;
  excludeUserId?: string;
}

export function EmployeeSelector({ selectedIds, onChange, departmentFilter, excludeUserId }: EmployeeSelectorProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ pageSize: "500", isActive: "true" });
    if (departmentFilter) {
      // Use department members API for filtered results
      fetch(`/api/departments/members?department=${encodeURIComponent(departmentFilter)}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success) setEmployees(res.employees);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
      return;
    }
    fetch(`/api/users?${params}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setEmployees(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [departmentFilter]);

  // Exclude the requester from the list, then apply search filter.
  // Done at render time so it works regardless of session/fetch timing.
  const availableEmployees = excludeUserId
    ? employees.filter((e) => String(e.id) !== String(excludeUserId))
    : employees;

  const filtered = availableEmployees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.department && e.department.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === filtered.length) {
      onChange([]);
    } else {
      onChange(filtered.map((e) => e.id));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{selectedIds.length} selected</Badge>
          <button
            type="button"
            onClick={selectAll}
            className="text-sm text-blue-600 hover:underline"
          >
            {selectedIds.length === filtered.length ? "Deselect All" : "Select All"}
          </button>
        </div>
      </div>
      <ScrollArea className="h-[250px] rounded-md border p-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading employees...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No employees found</p>
        ) : (
          filtered.map((emp) => (
            <label
              key={emp.id}
              className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <Checkbox
                checked={selectedIds.includes(emp.id)}
                onCheckedChange={() => toggle(emp.id)}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{emp.name}</p>
                <p className="text-xs text-muted-foreground">
                  {emp.email} {emp.department && `· ${emp.department}`}
                </p>
              </div>
            </label>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
