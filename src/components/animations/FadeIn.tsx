"use client";

import { cn } from "@/lib/utils";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  direction?: "up" | "down" | "none";
  delay?: number;
  duration?: number;
}

export function FadeIn({
  children,
  className,
  direction = "up",
  delay = 0,
  duration,
}: FadeInProps) {
  const animationClass = {
    up: "animate-fade-in-up",
    down: "animate-fade-in-down",
    none: "animate-fade-in",
  }[direction];

  return (
    <div
      className={cn(animationClass, "animate-fill-both", className)}
      style={{
        animationDelay: delay ? `${delay}ms` : undefined,
        animationDuration: duration ? `${duration}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
}
