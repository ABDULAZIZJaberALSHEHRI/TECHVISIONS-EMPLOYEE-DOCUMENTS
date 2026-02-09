"use client";

import { HRDashboard } from "@/components/dashboard/HRDashboard";

export default function HRDashboardPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">HR Dashboard</h1>
      <HRDashboard />
    </div>
  );
}
