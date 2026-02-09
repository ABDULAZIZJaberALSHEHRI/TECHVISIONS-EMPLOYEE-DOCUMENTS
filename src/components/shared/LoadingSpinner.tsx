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
  lg: "h-10 w-10",
};

export function LoadingSpinner({
  className,
  size = "md",
  text,
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2 animate-fade-in", className)}>
      <Loader2 className={cn("animate-spin text-blue-500", sizeMap[size])} />
      {text && <span className="text-sm text-gray-500">{text}</span>}
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
