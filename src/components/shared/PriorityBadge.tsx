"use client";

import { Badge } from "@/components/ui/badge";
import { PRIORITY_CONFIG } from "@/lib/constants";
import type { Priority } from "@prisma/client";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowUp, Zap } from "lucide-react";

interface PriorityBadgeProps {
  priority: Priority;
}

const priorityIcons = {
  LOW: null,
  MEDIUM: <ArrowUp className="h-3 w-3" />,
  HIGH: <AlertTriangle className="h-3 w-3" />,
  URGENT: <Zap className="h-3 w-3" />,
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  const icon = priorityIcons[priority];

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 hover:scale-105"
      style={{
        backgroundColor: config.bg,
        color: config.text,
      }}
    >
      {icon}
      <span>{config.label}</span>
    </div>
  );
}
