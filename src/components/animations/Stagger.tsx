"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  animation?: "fade-in-up" | "fade-in" | "scale-in";
}

export function Stagger({
  children,
  className,
  staggerDelay = 60,
  animation = "fade-in-up",
}: StaggerProps) {
  const animationClass = {
    "fade-in-up": "animate-fade-in-up",
    "fade-in": "animate-fade-in",
    "scale-in": "animate-scale-in",
  }[animation];

  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return (
          <div
            className={cn(animationClass, "animate-fill-both")}
            style={{ animationDelay: `${index * staggerDelay}ms` }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
