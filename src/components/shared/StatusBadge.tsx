"use client";

import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG } from "@/lib/constants";
import type { AssignmentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: AssignmentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 hover:scale-105",
        config.color
      )}
    >
      {config.label}
    </Badge>
  );
}
