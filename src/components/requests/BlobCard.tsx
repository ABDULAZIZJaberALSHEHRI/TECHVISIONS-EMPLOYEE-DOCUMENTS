"use client";

import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { Badge } from "@/components/ui/badge";
import { REQUEST_STATUS_CONFIG } from "@/lib/constants";
import { format, differenceInDays } from "date-fns";
import { Calendar, Users, Clock, FolderOpen, Trash2 } from "lucide-react";
import type { Priority, RequestStatus } from "@prisma/client";
import { useRouter } from "next/navigation";

interface BlobCardProps {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: RequestStatus;
  deadline: string;
  categoryName?: string;
  assignmentCount: number;
  submittedCount?: number;
  createdByName: string;
  assignedToName?: string;
  basePath?: string;
  animationDelay?: number;
  showDelete?: boolean;
  onDelete?: (id: string) => void;
}

const PRIORITY_BLOB_COLORS: Record<Priority, string> = {
  LOW: "#9CA3AF",
  MEDIUM: "#3B82F6",
  HIGH: "#EAB308",
  URGENT: "#EF4444",
};

export function BlobCard({
  id,
  title,
  description,
  priority,
  status,
  deadline,
  categoryName,
  assignmentCount,
  submittedCount = 0,
  createdByName,
  assignedToName,
  basePath = "/hr/requests",
  animationDelay = 0,
  showDelete = false,
  onDelete,
}: BlobCardProps) {
  const router = useRouter();
  const statusConfig = REQUEST_STATUS_CONFIG[status];
  const blobColor = PRIORITY_BLOB_COLORS[priority];
  const isCancelled = status === "CANCELLED";

  // Submission progress
  const progress = assignmentCount > 0 ? (submittedCount / assignmentCount) * 100 : 0;
  const progressColor = progress === 100 ? "#10B981" : "#3B82F6";

  // Deadline countdown
  const daysLeft = differenceInDays(new Date(deadline), new Date());
  let deadlineColor: string;
  let deadlineText: string;
  if (isCancelled) {
    deadlineColor = "#9CA3AF";
    deadlineText = format(new Date(deadline), "MMM dd, yyyy");
  } else if (daysLeft < 0) {
    deadlineColor = "#EF4444";
    deadlineText = `Overdue by ${Math.abs(daysLeft)} day(s)`;
  } else if (daysLeft === 0) {
    deadlineColor = "#F97316";
    deadlineText = "Due today";
  } else if (daysLeft <= 2) {
    deadlineColor = "#F97316";
    deadlineText = `Due in ${daysLeft} day(s)`;
  } else if (daysLeft <= 7) {
    deadlineColor = "#D97706";
    deadlineText = `Due in ${daysLeft} days`;
  } else {
    deadlineColor = "#6B7280";
    deadlineText = `Due in ${daysLeft} days`;
  }

  return (
    <div
      className="blob-card-wrapper relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      onClick={() => router.push(`${basePath}/${id}`)}
      style={{
        boxShadow: "20px 20px 60px #bebebe, -20px -20px 60px #ffffff",
        opacity: isCancelled ? 0.55 : 1,
        filter: isCancelled ? "grayscale(40%)" : "none",
      }}
    >
      {/* Animated Blob */}
      <div
        className="blob-animated absolute top-1/2 left-1/2 w-[150px] h-[150px] rounded-full -z-10"
        style={{
          backgroundColor: blobColor,
          filter: "blur(12px)",
          opacity: isCancelled ? 0.2 : 1,
          animation: isCancelled ? "none" : "blob-bounce 5s infinite ease",
          animationDelay: `${animationDelay}s`,
        }}
      />

      {/* Frosted Glass Content */}
      <div
        className="blob-content relative z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-[24px] rounded-xl overflow-hidden flex flex-col justify-between p-4 m-[5px]"
        style={{ outline: "2px solid white" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <PriorityBadge priority={priority} />
          <div className="flex items-center gap-1.5">
            {isCancelled ? (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                style={{
                  backgroundColor: "#FEE2E2",
                  color: "#991B1B",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                ⊗ Cancelled
              </span>
            ) : (
              <Badge variant="secondary" className={statusConfig.color}>
                {statusConfig.label}
              </Badge>
            )}
            {showDelete && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
                className="p-1 rounded-md text-gray-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                title="Delete Request"
                aria-label="Delete request"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div className="flex-1 min-h-0">
          <h3 className="mb-0.5 text-sm font-semibold line-clamp-1">{title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {description}
          </p>

          {/* Category chip */}
          {categoryName && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-md font-medium">
                <FolderOpen className="h-3 w-3" />
                {categoryName}
              </span>
            </div>
          )}

          {/* Submission Progress */}
          {!isCancelled && assignmentCount > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span>Submissions</span>
                <span className="font-medium">{submittedCount}/{assignmentCount}</span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: progressColor,
                  }}
                />
              </div>
            </div>
          )}

          {/* Deadline Countdown */}
          <div className="flex items-center gap-1 mb-1">
            <Clock className="h-3 w-3" style={{ color: deadlineColor }} />
            <span className="text-[11px] font-medium" style={{ color: deadlineColor }}>
              {deadlineText}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-gray-200/50">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(deadline), "MMM dd, yyyy")}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium text-[13px]">
            <Users className="h-4 w-4" />
            <span>{assignmentCount} assigned</span>
          </div>
        </div>
      </div>

      {/* Cancelled Watermark */}
      {isCancelled && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        >
          <span
            className="text-2xl font-extrabold tracking-widest uppercase"
            style={{
              color: "rgba(156, 163, 175, 0.25)",
              transform: "rotate(-20deg)",
            }}
          >
            CANCELLED
          </span>
        </div>
      )}

      <style jsx>{`
        @keyframes blob-bounce {
          0% {
            transform: translate(-100%, -100%) translate3d(0, 0, 0);
          }
          25% {
            transform: translate(-100%, -100%) translate3d(100%, 0, 0);
          }
          50% {
            transform: translate(-100%, -100%) translate3d(100%, 100%, 0);
          }
          75% {
            transform: translate(-100%, -100%) translate3d(0, 100%, 0);
          }
          100% {
            transform: translate(-100%, -100%) translate3d(0, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
