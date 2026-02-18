"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/ui/use-toast";
import { getInitials } from "@/lib/utils";
import { getRoleDisplay } from "@/lib/role-display";
import { useDebounce } from "@/hooks/useDebounce";
import { format } from "date-fns";
import { PageContainer, PageHeader, TableContainer } from "@/components/modern";
import { Check, X } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  department: string | null;
  jobTitle: string | null;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggleDialog, setToggleDialog] = useState<User | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "10");
    if (debouncedSearch) params.set("search", debouncedSearch);

    try {
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const startEditing = (u: User) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditDepartment(u.department || "");
    setEditJobTitle(u.jobTitle || "");
  };

  const cancelEditing = () => {
    setEditingUser(null);
  };

  const saveUserEdit = async (userId: string) => {
    setSaving(true);
    try {
      const payload: Record<string, string> = { role: editRole };
      if (editRole === "DEPARTMENT_HEAD") {
        payload.department = editDepartment;
        payload.jobTitle = editJobTitle;
      }

      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "User updated" });
        fetchUsers();
      } else {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setEditingUser(null);
    }
  };

  const toggleActive = async () => {
    if (!toggleDialog) return;
    try {
      const res = await fetch(`/api/users/${toggleDialog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !toggleDialog.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: toggleDialog.isActive ? "User deactivated" : "User activated",
        });
        fetchUsers();
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
    setToggleDialog(null);
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={u.avatarUrl || undefined} />
            <AvatarFallback className="bg-blue-500 text-white text-xs">
              {getInitials(u.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{u.name}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (u) => <span className="text-sm">{u.department || "—"}</span>,
    },
    {
      key: "role",
      header: "Role",
      render: (u) => {
        if (editingUser?.id === u.id) {
          return (
            <div className="space-y-2">
              <Select
                value={editRole}
                onValueChange={setEditRole}
              >
                <SelectTrigger className="w-[160px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="DEPARTMENT_HEAD">Dept Head</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                </SelectContent>
              </Select>

              {editRole === "DEPARTMENT_HEAD" && (
                <div className="space-y-1.5">
                  <Input
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    placeholder="Department (e.g. IT)"
                    className="h-7 text-xs w-[160px]"
                  />
                  <Input
                    value={editJobTitle}
                    onChange={(e) => setEditJobTitle(e.target.value)}
                    placeholder="Title (e.g. Manager)"
                    className="h-7 text-xs w-[160px]"
                  />
                </div>
              )}

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                  disabled={saving}
                  onClick={() => saveUserEdit(u.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                  onClick={cancelEditing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        }
        return (
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => startEditing(u)}
          >
            {getRoleDisplay(u)}
          </Badge>
        );
      },
    },
    {
      key: "isActive",
      header: "Status",
      render: (u) => (
        <Badge
          variant="secondary"
          className={
            u.isActive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }
        >
          {u.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      render: (u) => (
        <span className="text-xs text-muted-foreground">
          {u.lastLoginAt
            ? format(new Date(u.lastLoginAt), "MMM dd, yyyy")
            : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (u) => (
        <Button
          variant="outline"
          size="sm"
          className={
            u.isActive
              ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              : "text-green-600 dark:text-emerald-400 hover:bg-green-50 dark:hover:bg-emerald-900/30"
          }
          onClick={() => setToggleDialog(u)}
        >
          {u.isActive ? "Deactivate" : "Activate"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
      <DataTable
        columns={columns}
        data={users}
        total={total}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
        loading={loading}
        searchPlaceholder="Search users..."
        emptyTitle="No users found"
      />

      <ConfirmDialog
        open={!!toggleDialog}
        onOpenChange={() => setToggleDialog(null)}
        title={toggleDialog?.isActive ? "Deactivate User" : "Activate User"}
        description={`Are you sure you want to ${
          toggleDialog?.isActive ? "deactivate" : "activate"
        } ${toggleDialog?.name}?`}
        confirmLabel={toggleDialog?.isActive ? "Deactivate" : "Activate"}
        variant={toggleDialog?.isActive ? "destructive" : "default"}
        onConfirm={toggleActive}
      />
    </div>
  );
}
