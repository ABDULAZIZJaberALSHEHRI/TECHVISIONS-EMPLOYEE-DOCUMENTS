"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { EmployeeSelector } from "./EmployeeSelector";
import { Loader2 } from "lucide-react";

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
}

interface EditListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: EmployeeListData;
  excludeUserId?: string;
  departmentFilter?: string;
  onUpdated: () => void;
}

export function EditListDialog({
  open,
  onOpenChange,
  list,
  excludeUserId,
  departmentFilter,
  onUpdated,
}: EditListDialogProps) {
  const [name, setName] = useState(list.name);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    list.members.map((m) => m.employee.id)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset state when list prop changes
  useEffect(() => {
    setName(list.name);
    setSelectedIds(list.members.map((m) => m.employee.id));
    setError(null);
  }, [list]);

  const handleSave = async () => {
    if (!name.trim() || selectedIds.length === 0) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/employee-lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), memberIds: selectedIds }),
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: "List updated" });
        onOpenChange(false);
        onUpdated();
      } else {
        if (res.status === 409) {
          setError(data.error);
        } else {
          toast({ title: "Error", description: data.error || "Failed to update list", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Error", description: "Failed to update list", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit List</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-list-name">List Name</Label>
            <Input
              id="edit-list-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="List name"
              maxLength={100}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          <div>
            <Label>Members</Label>
            <EmployeeSelector
              selectedIds={selectedIds}
              onChange={setSelectedIds}
              excludeUserId={excludeUserId}
              departmentFilter={departmentFilter}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || selectedIds.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
