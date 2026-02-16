"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BlobCard } from "@/components/requests/BlobCard";
import { RequestFilters } from "@/components/requests/RequestFilters";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Plus, FileText } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { PageContainer, PageHeader } from "@/components/modern";

interface RequestItem {
  id: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "PENDING_HR" | "CLOSED" | "CANCELLED";
  deadline: string;
  category: { id: string; name: string } | null;
  createdBy: { id: string; name: string; email: string };
  assignedTo: { id: string; name: string; email: string } | null;
  _count: { assignments: number; attachments: number };
  assignments: { id: string; status: string }[];
}

export default function DeptHeadRequestsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <DeptHeadRequestsContent />
    </Suspense>
  );
}

function DeptHeadRequestsContent() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const debouncedSearch = useDebounce(search, 300);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const s = searchParams.get("status");
    if (s) setStatus(s);
  }, [searchParams]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "12");
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (status && status !== "ALL") params.set("status", status);
    if (priority && priority !== "ALL") params.set("priority", priority);
    if (categoryId && categoryId !== "ALL") params.set("categoryId", categoryId);

    try {
      const res = await fetch(`/api/requests?${params}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, priority, categoryId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const PRIORITY_ORDER: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };

  const sortedRequests = [...requests].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return 0;
      case "deadline_asc":
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      case "deadline_desc":
        return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
      case "priority_desc":
        return (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
      case "priority_asc":
        return (PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0);
      case "submissions_desc": {
        const aCount = a.assignments.filter((x) => x.status === "SUBMITTED" || x.status === "APPROVED").length;
        const bCount = b.assignments.filter((x) => x.status === "SUBMITTED" || x.status === "APPROVED").length;
        return bCount - aCount;
      }
      case "submissions_asc": {
        const aCount = a.assignments.filter((x) => x.status === "SUBMITTED" || x.status === "APPROVED").length;
        const bCount = b.assignments.filter((x) => x.status === "SUBMITTED" || x.status === "APPROVED").length;
        return aCount - bCount;
      }
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Department Requests</h1>
        <Button onClick={() => router.push("/dept-head/requests/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      <RequestFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onClear={() => {
          setSearch("");
          setStatus("");
          setPriority("");
          setCategoryId("");
          setSortBy("newest");
        }}
      />

      {loading ? (
        <PageLoader />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8 text-muted-foreground" />}
          title="No requests found"
          description="Create a document request for your department."
          actionLabel="Create Request"
          onAction={() => router.push("/dept-head/requests/new")}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedRequests.map((req, index) => (
              <BlobCard
                key={req.id}
                id={req.id}
                title={req.title}
                description={req.description}
                priority={req.priority}
                status={req.status}
                deadline={req.deadline}
                categoryName={req.category?.name}
                assignmentCount={req._count.assignments}
                submittedCount={req.assignments.filter((a) => a.status === "SUBMITTED" || a.status === "APPROVED").length}
                createdByName={req.createdBy.name}
                assignedToName={req.assignedTo?.name}
                basePath="/dept-head/requests"
                animationDelay={index * 0.3}
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
