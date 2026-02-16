"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import {
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Grid3X3,
} from "lucide-react";
import Link from "next/link";
import { PageContainer, PageHeader, ModernStatsCard, SectionCard } from "@/components/modern";
import { useRouter } from "next/navigation";

interface TrackingSummary {
  totalEmployees: number;
  totalRequests: number;
  completionRate: number;
  overdue: number;
  pending: number;
}

export default function DeptHeadDashboardPage() {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<TrackingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/tracking/matrix");
        const data = await res.json();
        if (data.success) {
          setSummary(data.summary);
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageLoader />;

  const dept = session?.user?.managedDepartment || "Your Department";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Department Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Managing: {dept}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dept-head/tracking">
              <Grid3X3 className="mr-2 h-4 w-4" />
              Tracking Matrix
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dept-head/requests/new">
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Link>
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ModernStatsCard
            title="Department Employees"
            value={summary.totalEmployees}
            icon={<Users className="h-5 w-5" />}
            color="blue"
            gradient
          />
          <ModernStatsCard
            title="Active Assignments"
            value={summary.totalRequests}
            icon={<FileText className="h-5 w-5" />}
            color="yellow"
            gradient
          />
          <ModernStatsCard
            title="Completion Rate"
            value={summary.completionRate}
            icon={<CheckCircle className="h-5 w-5" />}
            color="green"
            gradient
          />
          <ModernStatsCard
            title="Overdue"
            value={summary.overdue}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="red"
            gradient
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dept-head/requests/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Document Request
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dept-head/tracking">
                <Grid3X3 className="mr-2 h-4 w-4" />
                View Tracking Matrix
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dept-head/requests">
                <FileText className="mr-2 h-4 w-4" />
                View All Requests
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Attention Needed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary && summary.overdue > 0 ? (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4">
                <p className="font-medium text-red-700 dark:text-red-400">
                  {summary.overdue} overdue assignment{summary.overdue !== 1 ? "s" : ""}
                </p>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  Some employees have missed their submission deadlines.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                  asChild
                >
                  <Link href="/dept-head/tracking?status=OVERDUE">
                    View Overdue
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-emerald-900/30 p-4">
                <p className="font-medium text-green-700 dark:text-emerald-400">All caught up!</p>
                <p className="mt-1 text-sm text-green-600 dark:text-emerald-400">
                  No overdue assignments in your department.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
