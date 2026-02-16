"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-12 w-12",
};

export function LoadingSpinner({
  className,
  size = "md",
  text,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 animate-fade-in",
        className
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 blur-md opacity-30" />
        <Loader2
          className={cn(
            "relative animate-spin text-blue-600",
            sizeMap[size]
          )}
        />
      </div>
      {text && (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{text}</span>
      )}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );
}
