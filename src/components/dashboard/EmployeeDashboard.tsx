"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "./StatsCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ClipboardList,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { AssignmentStatus, Priority } from "@prisma/client";

interface EmployeeData {
  stats: {
    totalAssigned: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  recentActivity: {
    id: string;
    status: AssignmentStatus;
    reviewNote: string | null;
    request: { id: string; title: string };
    updatedAt: string;
  }[];
  pendingRequests: {
    id: string;
    status: AssignmentStatus;
    dueDate: string;
    request: {
      id: string;
      title: string;
      description: string;
      priority: Priority;
      category: { name: string } | null;
    };
  }[];
}

export function EmployeeDashboard() {
  const [data, setData] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard
          title="Total Assigned"
          value={data.stats.totalAssigned}
          icon={<ClipboardList className="h-6 w-6" />}
          delay={0}
        />
        <StatsCard
          title="Completed"
          value={data.stats.completed}
          icon={<CheckCircle className="h-6 w-6" />}
          color="green"
          delay={60}
        />
        <StatsCard
          title="Pending"
          value={data.stats.pending}
          icon={<Clock className="h-6 w-6" />}
          color="yellow"
          delay={120}
        />
        <StatsCard
          title="Overdue"
          value={data.stats.overdue}
          icon={<AlertTriangle className="h-6 w-6" />}
          color="red"
          pulse={data.stats.overdue > 0}
          delay={180}
        />
      </div>

      {/* Pending Requests */}
      <Card className="animate-fade-in-up animate-fill-both" style={{ animationDelay: "250ms" }}>
        <CardHeader>
          <CardTitle className="text-base">My Pending Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {data.pendingRequests.length === 0 ? (
            <EmptyState
              title="All caught up!"
              description="You have no pending document requests."
              icon={<CheckCircle className="h-8 w-8 text-emerald-500" />}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.pendingRequests.map((assignment, i) => (
                <Card
                  key={assignment.id}
                  className={cn(
                    "cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 animate-fade-in-up animate-fill-both",
                    assignment.status === "OVERDUE" && "border-red-200 bg-red-50/20"
                  )}
                  style={{ animationDelay: `${300 + i * 60}ms` }}
                  onClick={() =>
                    router.push(
                      `/employee/requests/${assignment.request.id}`
                    )
                  }
                >
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <PriorityBadge priority={assignment.request.priority} />
                      <StatusBadge status={assignment.status} />
                    </div>
                    <h4 className="mb-1 font-semibold text-sm text-gray-900 dark:text-white line-clamp-2">
                      {assignment.request.title}
                    </h4>
                    <p className="mb-2 text-xs text-gray-400 dark:text-slate-500 line-clamp-2">
                      {assignment.request.description}
                    </p>
                    {assignment.request.category && (
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {assignment.request.category.name}
                      </p>
                    )}
                    <p
                      className={cn(
                        "mt-2 text-xs font-medium",
                        assignment.status === "OVERDUE"
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-400 dark:text-slate-500"
                      )}
                    >
                      Due: {format(new Date(assignment.dueDate), "MMM dd, yyyy")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="animate-fade-in-up animate-fill-both" style={{ animationDelay: "400ms" }}>
        <CardHeader>
          <CardTitle className="text-base">My Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-2 last:border-0 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/30 rounded-lg px-2 py-1.5 transition-all duration-150"
                  onClick={() =>
                    router.push(`/employee/requests/${item.request.id}`)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div>
                      {item.status === "APPROVED" && (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      )}
                      {item.status === "REJECTED" && (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                      {item.status === "SUBMITTED" && (
                        <Clock className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.request.title}
                      </p>
                      {item.status === "REJECTED" && item.reviewNote && (
                        <p className="text-xs text-red-500 line-clamp-1">
                          Reason: {item.reviewNote}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
