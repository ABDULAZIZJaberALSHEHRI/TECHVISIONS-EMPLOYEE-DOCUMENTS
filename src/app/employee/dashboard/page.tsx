"use client";

import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { PageContainer, PageHeader } from "@/components/modern";

export default function EmployeeDashboardPage() {
  return (
    <PageContainer>
      <PageHeader
        title="My Dashboard"
        description="View your pending document requests and tasks"
      />
      <EmployeeDashboard />
    </PageContainer>
  );
}
