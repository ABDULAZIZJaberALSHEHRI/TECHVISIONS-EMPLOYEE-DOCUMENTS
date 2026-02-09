"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/components/requests/RequestCard";
import { RequestFilters } from "@/components/requests/RequestFilters";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Plus, Download, FileText } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface RequestItem {
  id: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "CLOSED" | "CANCELLED";
  deadline: string;
  category: { id: string; name: string } | null;
  createdBy: { id: string; name: string; email: string };
  _count: { assignments: number; attachments: number };
}

export default function HRRequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
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
  }, [page, debouncedSearch, status, priority]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleExport = () => {
    window.open("/api/requests/export", "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B4F72]">Document Requests</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => router.push("/hr/requests/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>
      </div>

      <RequestFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
        onClear={() => {
          setSearch("");
          setStatus("");
          setPriority("");
        }}
      />

      {loading ? (
        <PageLoader />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8 text-muted-foreground" />}
          title="No requests found"
          description="Create your first document request to get started."
          actionLabel="Create Request"
          onAction={() => router.push("/hr/requests/new")}
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
