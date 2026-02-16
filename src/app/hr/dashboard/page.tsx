"use client";

import { HRDashboard } from "@/components/dashboard/HRDashboard";
import { PageContainer, PageHeader } from "@/components/modern";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function HRDashboardPage() {
  const router = useRouter();

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Overview of document requests and assignments"
        actions={
          <Button
            onClick={() => router.push("/hr/requests/new")}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/30"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        }
      />
      <HRDashboard />
    </PageContainer>
  );
}
