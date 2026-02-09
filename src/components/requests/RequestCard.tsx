"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { Badge } from "@/components/ui/badge";
import { REQUEST_STATUS_CONFIG } from "@/lib/constants";
import { format } from "date-fns";
import { Calendar, Users } from "lucide-react";
import type { Priority, RequestStatus } from "@prisma/client";
import { useRouter } from "next/navigation";

interface RequestCardProps {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: RequestStatus;
  deadline: string;
  categoryName?: string;
  assignmentCount: number;
  createdByName: string;
}

export function RequestCard({
  id,
  title,
  description,
  priority,
  status,
  deadline,
  categoryName,
  assignmentCount,
  createdByName,
}: RequestCardProps) {
  const router = useRouter();
  const statusConfig = REQUEST_STATUS_CONFIG[status];

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => router.push(`/hr/requests/${id}`)}
    >
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <PriorityBadge priority={priority} />
          <Badge variant="secondary" className={statusConfig.color}>
            {statusConfig.label}
          </Badge>
        </div>
        <h3 className="mb-1 text-sm font-semibold line-clamp-1">{title}</h3>
        <p className="mb-3 text-xs text-muted-foreground line-clamp-2">
          {description}
        </p>
        {categoryName && (
          <p className="mb-2 text-xs text-muted-foreground">{categoryName}</p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(deadline), "MMM dd, yyyy")}
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {assignmentCount}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
