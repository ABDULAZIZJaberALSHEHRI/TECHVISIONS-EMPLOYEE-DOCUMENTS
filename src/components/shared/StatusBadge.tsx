"use client";

import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG } from "@/lib/constants";
import type { AssignmentStatus } from "@prisma/client";

interface StatusBadgeProps {
  status: AssignmentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="secondary" className={config.color}>
      {config.label}
    </Badge>
  );
}
