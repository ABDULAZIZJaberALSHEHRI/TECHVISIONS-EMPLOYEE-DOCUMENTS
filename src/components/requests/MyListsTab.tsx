"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EditListDialog } from "./EditListDialog";
import { useToast } from "@/components/ui/use-toast";
import { Edit, Trash2, Users, Loader2 } from "lucide-react";

interface ListMember {
  id: string;
  employee: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    isActive: boolean;
  };
}

interface EmployeeListData {
  id: string;
  name: string;
  members: ListMember[];
  _count: { members: number };
}

interface MyListsTabProps {
  onSelectList: (memberIds: string[]) => void;
  excludeUserId?: string;
  departmentFilter?: string;
  refreshKey: number;
}

export function MyListsTab({
  onSelectList,
  excludeUserId,
  departmentFilter,
  refreshKey,
}: MyListsTabProps) {
  const [lists, setLists] = useState<EmployeeListData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingList, setEditingList] = useState<EmployeeListData | null>(null);
  const [deletingList, setDeletingList] = useState<EmployeeListData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { toast } = useToast();

  const fetchLists = async () => {
    try {
      const res = await fetch("/api/employee-lists");
      const data = await res.json();
      if (data.success) setLists(data.data);
    } catch (error) {
      console.error("Failed to fetch lists:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, [refreshKey]);

  const handleSelect = (list: EmployeeListData) => {
    const activeMembers = list.members.filter(
      (m) => m.employee.isActive && (!excludeUserId || String(m.employee.id) !== String(excludeUserId))
    );
    const excluded = list._count.members - activeMembers.length;

    if (activeMembers.length === 0) {
      toast({
        title: "No available members",
        description: "All members in this list are inactive or unavailable.",
        variant: "destructive",
      });
      return;
    }

    if (excluded > 0) {
      toast({
        title: "Some members excluded",
        description: `${excluded} member(s) were inactive or unavailable and excluded.`,
      });
    }

    onSelectList(activeMembers.map((m) => m.employee.id));
  };

  const handleDelete = async () => {
    if (!deletingList) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/employee-lists/${deletingList.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "List deleted" });
        setLists((prev) => prev.filter((l) => l.id !== deletingList.id));
      } else {
        toast({ title: "Error", description: data.error || "Failed to delete", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete list", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
      setDeletingList(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading lists...</span>
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <Users className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">No saved lists yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Switch to &quot;Select Employees&quot;, pick employees, and click &quot;Save as List&quot; to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ScrollArea className="h-[280px]">
        <div className="space-y-2 pr-3">
          {lists.map((list) => {
            const activeCount = list.members.filter((m) => m.employee.isActive).length;
            const inactiveCount = list._count.members - activeCount;

            return (
              <div
                key={list.id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{list.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      <Users className="mr-1 h-3 w-3" />
                      {activeCount} member{activeCount !== 1 ? "s" : ""}
                    </Badge>
                    {inactiveCount > 0 && (
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                        {inactiveCount} inactive
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSelect(list)}
                  >
                    Use
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingList(list)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600"
                    onClick={() => setDeletingList(list)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {editingList && (
        <EditListDialog
          open={!!editingList}
          onOpenChange={(v) => { if (!v) setEditingList(null); }}
          list={editingList}
          excludeUserId={excludeUserId}
          departmentFilter={departmentFilter}
          onUpdated={() => { setEditingList(null); fetchLists(); }}
        />
      )}

      <ConfirmDialog
        open={!!deletingList}
        onOpenChange={() => setDeletingList(null)}
        title="Delete List"
        description={`Are you sure you want to delete "${deletingList?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
