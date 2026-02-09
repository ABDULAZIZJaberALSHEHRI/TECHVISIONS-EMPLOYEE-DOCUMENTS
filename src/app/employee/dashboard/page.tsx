"use client";

import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";

export default function EmployeeDashboardPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Dashboard</h1>
      <EmployeeDashboard />
    </div>
  );
}
