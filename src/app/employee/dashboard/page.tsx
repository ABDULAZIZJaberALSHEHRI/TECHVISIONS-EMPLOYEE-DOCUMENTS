"use client";

import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";

export default function EmployeeDashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#1B4F72]">My Dashboard</h1>
      <EmployeeDashboard />
    </div>
  );
}
