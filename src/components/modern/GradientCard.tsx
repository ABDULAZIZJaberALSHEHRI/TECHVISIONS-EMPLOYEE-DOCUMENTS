"use client";

import { cn } from "@/lib/utils";

interface GradientCardProps {
  children: React.ReactNode;
  variant?: "default" | "gradient" | "glow";
  className?: string;
  onClick?: () => void;
}

export function GradientCard({
  children,
  variant = "default",
  className,
  onClick,
}: GradientCardProps) {
  if (variant === "gradient") {
    return (
      <div
        className={cn(
          "relative group",
          onClick && "cursor-pointer",
          className
        )}
        onClick={onClick}
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500" />
        <div className="relative bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 group-hover:shadow-xl">
          {children}
        </div>
      </div>
    );
  }

  if (variant === "glow") {
    return (
      <div
        className={cn(
          "relative group",
          onClick && "cursor-pointer",
          className
        )}
        onClick={onClick}
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 rounded-2xl opacity-20 blur-lg group-hover:opacity-40 transition duration-500" />
        <div className="relative bg-white rounded-2xl shadow-md border border-slate-200 p-6 transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-0.5">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white rounded-2xl shadow-md border border-slate-200 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
