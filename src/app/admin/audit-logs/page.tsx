"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/shared/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "20");
    if (action && action !== "ALL") params.set("action", action);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    try {
      const res = await fetch(`/api/audit-logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  }, [page, action, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: Column<AuditLog>[] = [
    {
      key: "createdAt",
      header: "Time",
      render: (log) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: "user",
      header: "User",
      render: (log) => (
        <div>
          <p className="text-sm font-medium">
            {log.user?.name || "System"}
          </p>
          {log.user && (
            <p className="text-xs text-muted-foreground">{log.user.email}</p>
          )}
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (log) => (
        <Badge variant="outline" className="text-xs">
          {log.action}
        </Badge>
      ),
    },
    {
      key: "entityType",
      header: "Entity",
      render: (log) => (
        <span className="text-sm">
          {log.entityType || "—"}
          {log.entityId && (
            <span className="text-xs text-muted-foreground ml-1">
              ({log.entityId.slice(0, 8)}...)
            </span>
          )}
        </span>
      ),
    },
    {
      key: "details",
      header: "Details",
      render: (log) => (
        <span className="text-xs text-muted-foreground max-w-[200px] truncate block">
          {log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}
        </span>
      ),
    },
    {
      key: "ipAddress",
      header: "IP",
      render: (log) => (
        <span className="text-xs text-muted-foreground">
          {log.ipAddress || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>

      <div className="flex flex-wrap gap-3">
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Actions</SelectItem>
            <SelectItem value="LOGIN">Login</SelectItem>
            <SelectItem value="CREATE_REQUEST">Create Request</SelectItem>
            <SelectItem value="UPLOAD_DOCUMENT">Upload Document</SelectItem>
            <SelectItem value="APPROVE_DOCUMENT">Approve</SelectItem>
            <SelectItem value="REJECT_DOCUMENT">Reject</SelectItem>
            <SelectItem value="UPDATE_USER">Update User</SelectItem>
            <SelectItem value="UPDATE_SETTINGS">Update Settings</SelectItem>
            <SelectItem value="SEND_REMINDER">Send Reminder</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-[160px]"
          placeholder="Start date"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-[160px]"
          placeholder="End date"
        />
      </div>

      <DataTable
        columns={columns}
        data={logs}
        total={total}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        loading={loading}
        emptyTitle="No audit logs found"
        emptyDescription="No logs match the selected filters."
      />
    </div>
  );
}
