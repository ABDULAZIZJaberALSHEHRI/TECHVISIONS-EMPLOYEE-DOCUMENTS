"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/components/requests/RequestCard";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Inbox, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/useDebounce";

interface AssignedRequest {
  id: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "PENDING_HR" | "CLOSED" | "CANCELLED";
  deadline: string;
  createdAt: string;
  category: { id: string; name: string } | null;
  createdBy: { id: string; name: string; email: string };
  assignedTo: { id: string; name: string; email: string } | null;
  _count: { assignments: number; attachments: number };
}

export default function HRAssignmentsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HRAssignmentsContent />
    </Suspense>
  );
}

function HRAssignmentsContent() {
  const [requests, setRequests] = useState<AssignedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const router = useRouter();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "12");
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (priority && priority !== "ALL") params.set("priority", priority);
    if (status && status !== "ALL") params.set("status", status);

    try {
      const res = await fetch(`/api/hr/assignments?${params}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
        setTotal(data.total);
        setPendingCount(data.pendingCount);
      }
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, priority, status]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Incoming Tasks</h1>
          {pendingCount > 0 && (
            <Badge className="bg-purple-100 text-purple-700">
              {pendingCount} pending
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search by title, sender..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING_HR">Pending HR</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priority</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
        {(search || priority || status) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setPriority("");
              setStatus("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-8 w-8 text-muted-foreground" />}
          title="No incoming tasks"
          description="Requests assigned to you by Admin or Department Heads will appear here."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                id={req.id}
                title={req.title}
                description={req.description}
                priority={req.priority}
                status={req.status}
                deadline={req.deadline}
                categoryName={req.category?.name}
                assignmentCount={req._count.assignments}
                createdByName={req.createdBy.name}
                assignedToName={req.assignedTo?.name}
                basePath="/hr/assignments"
              />
            ))}
          </div>
          {total > 12 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center text-sm">
                Page {page} of {Math.ceil(total / 12)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(total / 12)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
