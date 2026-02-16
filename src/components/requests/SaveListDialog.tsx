"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";

interface SaveListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmployeeIds: string[];
  onSaved: () => void;
}

export function SaveListDialog({
  open,
  onOpenChange,
  selectedEmployeeIds,
  onSaved,
}: SaveListDialogProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/employee-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), memberIds: selectedEmployeeIds }),
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: "List saved", description: `"${name.trim()}" with ${selectedEmployeeIds.length} member(s)` });
        setName("");
        onOpenChange(false);
        onSaved();
      } else {
        if (res.status === 409) {
          setError(data.error);
        } else {
          toast({ title: "Error", description: data.error || "Failed to save list", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Error", description: "Failed to save list", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setName(""); setError(null); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Employee List</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="list-name">List Name</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="e.g., Finance Team"
              maxLength={100}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          <p className="text-sm text-muted-foreground">
            This list will contain <strong>{selectedEmployeeIds.length}</strong> employee{selectedEmployeeIds.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
