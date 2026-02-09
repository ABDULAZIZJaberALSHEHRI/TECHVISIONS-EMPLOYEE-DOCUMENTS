"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useDebounce } from "@/hooks/useDebounce";
import { format } from "date-fns";

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

  const updateRole = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Role updated" });
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
        description: "Failed to update role",
        variant: "destructive",
      });
    }
    setEditingUser(null);
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
            <AvatarFallback className="bg-[#1B4F72] text-white text-xs">
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
            <Select
              value={editRole}
              onValueChange={(val) => updateRole(u.id, val)}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        return (
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => {
              setEditingUser(u);
              setEditRole(u.role);
            }}
          >
            {u.role}
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
              ? "text-red-600 hover:bg-red-50"
              : "text-green-600 hover:bg-green-50"
          }
          onClick={() => setToggleDialog(u)}
        >
          {u.isActive ? "Deactivate" : "Activate"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1B4F72]">User Management</h1>
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
