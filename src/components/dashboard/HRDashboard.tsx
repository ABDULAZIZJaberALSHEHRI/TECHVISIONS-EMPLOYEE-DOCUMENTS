"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsCard } from "./StatsCard";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import {
  FileText,
  Clock,
  Upload,
  AlertTriangle,
  CheckCircle,
  Plus,
  Users,
  Inbox,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
  stats: {
    totalRequests: number;
    pendingSubmissions: number;
    submittedAwaitingReview: number;
    overdue: number;
    approvedThisMonth: number;
    rejectedThisMonth: number;
  };
  workloadOverview: {
    personalRequests: number;
    assignedTasks: number;
  };
  statusDistribution: { status: string; count: number }[];
  requestsPerMonth: { month: string; count: number }[];
  recentActivity: {
    id: string;
    action: string;
    details: Record<string, unknown> | null;
    createdAt: string;
    user: { name: string } | null;
  }[];
  upcomingDeadlines: {
    id: string;
    title: string;
    deadline: string;
    totalAssignments: number;
    completedAssignments: number;
    completionPercent: number;
  }[];
}

const PIE_COLORS = ["#F59E0B", "#3B82F6", "#22C55E", "#EF4444", "#8B5CF6"];
const WORKLOAD_COLORS = ["#3B82F6", "#8B5CF6"];

export function HRDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
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

  const workloadData = [
    { name: "My Requests", value: data.workloadOverview.personalRequests },
    { name: "Assigned to Me", value: data.workloadOverview.assignedTasks },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Active Requests"
          value={data.stats.totalRequests}
          icon={<FileText className="h-6 w-6" />}
          delay={0}
        />
        <StatsCard
          title="Pending"
          value={data.stats.pendingSubmissions}
          icon={<Clock className="h-6 w-6" />}
          color="yellow"
          delay={60}
        />
        <StatsCard
          title="Awaiting Review"
          value={data.stats.submittedAwaitingReview}
          icon={<Upload className="h-6 w-6" />}
          color="blue"
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
        <StatsCard
          title="Approved (Month)"
          value={data.stats.approvedThisMonth}
          icon={<CheckCircle className="h-6 w-6" />}
          color="green"
          delay={240}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Submissions by Status */}
        <Card className="animate-fade-in-up animate-fill-both" style={{ animationDelay: "300ms" }}>
          <CardHeader>
            <CardTitle className="text-base">Submissions by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {data.statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.statusDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    label={({ name, value }) => `${name ?? ""}: ${value ?? ""}`}
                  >
                    {data.statusDistribution.map((_, index) => (
                      <Cell
                        key={index}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-gray-400">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workload Overview */}
        <Card className="animate-fade-in-up animate-fill-both" style={{ animationDelay: "330ms" }}>
          <CardHeader>
            <CardTitle className="text-base">Workload Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {workloadData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={workloadData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    label={({ name, value }) => `${name ?? ""}: ${value ?? ""}`}
                  >
                    {workloadData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={WORKLOAD_COLORS[index % WORKLOAD_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-gray-400">
                No workload data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Requests Per Month */}
        <Card className="animate-fade-in-up animate-fill-both" style={{ animationDelay: "360ms" }}>
          <CardHeader>
            <CardTitle className="text-base">Requests Per Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.requestsPerMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6B7280" }} />
                <YAxis allowDecimals={false} tick={{ fill: "#6B7280" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="animate-fade-in-up animate-fill-both" style={{ animationDelay: "420ms" }}>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400">No recent activity</p>
            ) : (
              data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between border-b border-gray-100 pb-2 last:border-0 transition-colors duration-150 hover:bg-gray-50 rounded-lg px-2 py-1 -mx-2"
                >
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">
                        {activity.user?.name || "System"}
                      </span>{" "}
                      {activity.action.toLowerCase().replace(/_/g, " ")}
                    </p>
                    {activity.details &&
                      typeof activity.details === "object" &&
                      "requestTitle" in activity.details && (
                        <p className="text-xs text-gray-400">
                          {String(activity.details.requestTitle)}
                        </p>
                      )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="animate-fade-in-up animate-fill-both" style={{ animationDelay: "480ms" }}>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-gray-400">
                No upcoming deadlines in the next 7 days
              </p>
            ) : (
              data.upcomingDeadlines.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 cursor-pointer hover:bg-blue-50/50 rounded-lg px-2 py-1.5 -mx-2 transition-all duration-150"
                  onClick={() => router.push(`/hr/requests/${item.id}`)}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-400">
                      Due: {format(new Date(item.deadline), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      item.completionPercent === 100
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700"
                    }
                  >
                    {item.completionPercent}%
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="animate-fade-in-up animate-fill-both" style={{ animationDelay: "540ms" }}>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => router.push("/hr/requests/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Request
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/hr/assignments")}
          >
            <Inbox className="mr-2 h-4 w-4" />
            Incoming Tasks
          </Button>
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            onClick={() => router.push("/hr/requests?status=OVERDUE")}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            View Overdue
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/hr/employees")}
          >
            <Users className="mr-2 h-4 w-4" />
            View All Employees
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
