"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Paperclip,
  Send,
  Download,
  Search,
  Users,
  FileText,
  BarChart3,
  XCircle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/useDebounce";

interface TrackingRequest {
  requestId: string;
  requestTitle: string;
  assignmentId: string;
  status: string;
  submittedAt: string | null;
  dueDate: string;
  priority: string;
  isOverdue: boolean;
  hasDocuments: boolean;
  hasTemplate: boolean;
  reminderCount: number;
  lastReminderAt: string | null;
}

interface TrackingEmployee {
  id: string;
  name: string;
  email: string;
  department: string | null;
  requests: TrackingRequest[];
}

interface TrackingSummary {
  totalEmployees: number;
  totalRequests: number;
  completionRate: number;
  overdue: number;
  pending: number;
}

export function TrackingMatrix() {
  const [employees, setEmployees] = useState<TrackingEmployee[]>([]);
  const [summary, setSummary] = useState<TrackingSummary | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Selection
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      if (data.success) setDepartments(data.departments);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(
          data.data
            .filter((c: { isActive: boolean }) => c.isActive)
            .map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, []);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (departmentFilter && departmentFilter !== "ALL") params.set("department", departmentFilter);
    if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
    if (categoryFilter && categoryFilter !== "ALL") params.set("categoryId", categoryFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);

    try {
      const res = await fetch(`/api/tracking/matrix?${params}`);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to fetch matrix:", err);
    } finally {
      setLoading(false);
    }
  }, [departmentFilter, statusFilter, categoryFilter, debouncedSearch]);

  useEffect(() => {
    fetchDepartments();
    fetchCategories();
  }, [fetchDepartments, fetchCategories]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedEmployees.size === employees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map((e) => e.id)));
    }
  };

  const handleSendReminders = async () => {
    if (selectedEmployees.size === 0) {
      toast({ title: "No employees selected", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/tracking/send-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: Array.from(selectedEmployees),
          departmentFilter: departmentFilter && departmentFilter !== "ALL" ? departmentFilter : undefined,
          statusFilter: "PENDING",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Reminders sent",
          description: `${data.sent} sent, ${data.failed} failed`,
        });
        setSelectedEmployees(new Set());
        fetchMatrix();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to send reminders", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (departmentFilter && departmentFilter !== "ALL") params.set("department", departmentFilter);
    window.open(`/api/tracking/export?${params}`, "_blank");
  };

  const getStatusIcon = (req: TrackingRequest) => {
    if (req.status === "APPROVED") {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </TooltipTrigger>
            <TooltipContent>Approved</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (req.status === "SUBMITTED") {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-5 w-5 text-blue-500" />
                {req.hasDocuments && <Paperclip className="h-3 w-3 text-blue-400" />}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Submitted{req.submittedAt ? ` on ${format(new Date(req.submittedAt), "MMM dd")}` : ""}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (req.status === "REJECTED") {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <XCircle className="h-5 w-5 text-orange-500" />
            </TooltipTrigger>
            <TooltipContent>Rejected - needs resubmission</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (req.isOverdue) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </TooltipTrigger>
            <TooltipContent>
              Overdue - was due {format(new Date(req.dueDate), "MMM dd")}
              {req.reminderCount > 0 && ` (${req.reminderCount} reminders sent)`}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Clock className="h-5 w-5 text-yellow-500" />
          </TooltipTrigger>
          <TooltipContent>
            Pending - due {format(new Date(req.dueDate), "MMM dd")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Get unique request titles for column headers
  const allRequests = new Map<string, string>();
  employees.forEach((emp) => {
    emp.requests.forEach((r) => {
      if (!allRequests.has(r.requestId)) {
        allRequests.set(r.requestId, r.requestTitle);
      }
    });
  });
  const requestColumns = Array.from(allRequests.entries());

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{summary.totalEmployees}</p>
                <p className="text-xs text-muted-foreground">Employees</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <FileText className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{summary.totalRequests}</p>
                <p className="text-xs text-muted-foreground">Assignments</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <BarChart3 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{summary.completionRate}%</p>
                <p className="text-xs text-muted-foreground">Completion</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{summary.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{summary.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendReminders}
                disabled={selectedEmployees.size === 0 || sending}
              >
                {sending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1 h-4 w-4" />
                )}
                Remind ({selectedEmployees.size})
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-1 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matrix Table */}
      {loading ? (
        <PageLoader />
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No data found</p>
            <p className="text-sm text-muted-foreground">
              No employees match the current filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop: Table View */}
          <div className="hidden lg:block">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50 dark:bg-slate-800">
                        <th className="sticky left-0 z-10 bg-gray-50 dark:bg-slate-800 p-3 text-left">
                          <Checkbox
                            checked={selectedEmployees.size === employees.length && employees.length > 0}
                            onCheckedChange={toggleAll}
                          />
                        </th>
                        <th className="sticky left-10 z-10 bg-gray-50 dark:bg-slate-800 p-3 text-left text-sm font-medium min-w-[200px]">
                          Employee
                        </th>
                        <th className="p-3 text-left text-sm font-medium min-w-[120px]">
                          Department
                        </th>
                        {requestColumns.map(([id, title]) => (
                          <th
                            key={id}
                            className="p-3 text-center text-xs font-medium min-w-[120px] max-w-[160px]"
                            title={title}
                          >
                            <span className="line-clamp-2">{title}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => (
                        <tr key={emp.id} className="border-b hover:bg-gray-50/50 dark:hover:bg-slate-700/50">
                          <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 p-3">
                            <Checkbox
                              checked={selectedEmployees.has(emp.id)}
                              onCheckedChange={() => toggleEmployee(emp.id)}
                            />
                          </td>
                          <td className="sticky left-10 z-10 bg-white dark:bg-slate-800 p-3">
                            <div>
                              <p className="text-sm font-medium">{emp.name}</p>
                              <p className="text-xs text-muted-foreground">{emp.email}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {emp.department || "N/A"}
                            </Badge>
                          </td>
                          {requestColumns.map(([reqId]) => {
                            const req = emp.requests.find((r) => r.requestId === reqId);
                            return (
                              <td key={reqId} className="p-3 text-center">
                                {req ? (
                                  getStatusIcon(req)
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile: Card View */}
          <div className="grid gap-4 lg:hidden">
            {employees.map((emp) => (
              <Card key={emp.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedEmployees.has(emp.id)}
                      onCheckedChange={() => toggleEmployee(emp.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {emp.department || "N/A"}
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-2">
                        {emp.requests.map((req) => (
                          <div
                            key={req.assignmentId}
                            className="flex items-center justify-between rounded-lg border p-2"
                          >
                            <span className="text-sm line-clamp-1 flex-1">
                              {req.requestTitle}
                            </span>
                            <div className="ml-2">{getStatusIcon(req)}</div>
                          </div>
                        ))}
                        {emp.requests.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No active assignments
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Legend</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <span>Submitted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-orange-500" />
              <span>Rejected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Paperclip className="h-4 w-4 text-blue-400" />
              <span>Has Documents</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
