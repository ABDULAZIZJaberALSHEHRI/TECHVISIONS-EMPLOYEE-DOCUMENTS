"use client";

import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-20 text-center animate-fade-in",
        className
      )}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 blur-xl opacity-50" />
        <div className="relative rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 p-6 shadow-lg">
          {icon || <FileQuestion className="h-10 w-10 text-slate-400 dark:text-slate-500" />}
        </div>
      </div>
      <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mb-6 max-w-md text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/40"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
