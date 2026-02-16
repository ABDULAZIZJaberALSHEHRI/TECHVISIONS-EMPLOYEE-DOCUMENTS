"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HRUser {
  id: string;
  name: string;
  email: string;
}

interface HRSelectorProps {
  value?: string;
  onChange: (hrId: string | undefined) => void;
  disabled?: boolean;
  excludeUserId?: string;
}

export function HRSelector({ value, onChange, disabled, excludeUserId }: HRSelectorProps) {
  const [hrUsers, setHrUsers] = useState<HRUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users?role=HR&isActive=true&pageSize=100")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setHrUsers(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="assignedToId">Assign to HR</Label>
      <Select
        value={value || "NONE"}
        onValueChange={(val) => onChange(val === "NONE" ? undefined : val)}
        disabled={disabled || loading}
      >
        <SelectTrigger id="assignedToId">
          <SelectValue placeholder={loading ? "Loading..." : "Select HR user"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NONE">Not Assigned</SelectItem>
          {hrUsers.filter((hr) => !excludeUserId || String(hr.id) !== String(excludeUserId)).map((hr) => (
            <SelectItem key={hr.id} value={hr.id}>
              {hr.name} ({hr.email})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Assign this request to a specific HR user for processing.
      </p>
    </div>
  );
}
