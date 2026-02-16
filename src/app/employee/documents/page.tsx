"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { FileText, Download, Paperclip } from "lucide-react";
import type { AssignmentStatus, Priority } from "@prisma/client";
import { PageContainer, PageHeader, GradientCard } from "@/components/modern";

interface RequestItem {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  deadline: string;
  templateUrl?: string | null;
  templateName?: string | null;
  category: { name: string } | null;
  assignments: { id: string; status: AssignmentStatus }[];
}

export default function MyDocumentsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/requests?pageSize=100");
      const data = await res.json();
      if (data.success) setRequests(data.data);
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  if (loading) return <PageLoader />;

  const getStatus = (req: RequestItem): AssignmentStatus => {
    return req.assignments[0]?.status || "PENDING";
  };

  const allRequests = requests;
  const pending = requests.filter((r) =>
    ["PENDING", "OVERDUE"].includes(getStatus(r))
  );
  const submitted = requests.filter((r) => getStatus(r) === "SUBMITTED");
  const completed = requests.filter((r) =>
    ["APPROVED", "REJECTED"].includes(getStatus(r))
  );

  const renderList = (items: RequestItem[]) => {
    if (items.length === 0) {
      return (
        <EmptyState
          title="No requests"
          description="Nothing to show here."
          icon={<FileText className="h-8 w-8 text-muted-foreground" />}
        />
      );
    }

    return (
      <div className="space-y-3">
        {items.map((req) => (
          <Card
            key={req.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => router.push(`/employee/requests/${req.id}`)}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <PriorityBadge priority={req.priority} />
                  {req.category && (
                    <span className="text-xs text-muted-foreground">
                      {req.category.name}
                    </span>
                  )}
                  {req.templateUrl && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                      <Paperclip className="mr-1 h-3 w-3" />
                      Template
                    </Badge>
                  )}
                </div>
                <h3 className="text-sm font-semibold">{req.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {req.description}
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">
                    Due: {format(new Date(req.deadline), "MMM dd, yyyy")}
                  </p>
                  {req.templateUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/api/requests/${req.id}/template`, "_blank");
                      }}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <Download className="h-3 w-3" />
                      Download Template
                    </button>
                  )}
                </div>
              </div>
              <StatusBadge status={getStatus(req)} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900">Requests</h1>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({allRequests.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="submitted">
            Submitted ({submitted.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completed.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {renderList(allRequests)}
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          {renderList(pending)}
        </TabsContent>
        <TabsContent value="submitted" className="mt-4">
          {renderList(submitted)}
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          {renderList(completed)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
