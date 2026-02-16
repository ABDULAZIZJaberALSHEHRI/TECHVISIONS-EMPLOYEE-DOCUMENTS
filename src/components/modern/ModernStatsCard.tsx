"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ModernStatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: "default" | "yellow" | "blue" | "red" | "green" | "purple";
  gradient?: boolean;
  pulse?: boolean;
  delay?: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const gradientMap = {
  default: "from-slate-500 to-slate-600",
  yellow: "from-amber-500 to-orange-600",
  blue: "from-blue-500 to-cyan-600",
  red: "from-red-500 to-rose-600",
  green: "from-emerald-500 to-teal-600",
  purple: "from-purple-500 to-pink-600",
};

const iconBgMap = {
  default: "bg-slate-100 dark:bg-slate-700",
  yellow: "bg-amber-50 dark:bg-amber-900/30",
  blue: "bg-blue-50 dark:bg-blue-900/30",
  red: "bg-red-50 dark:bg-red-900/30",
  green: "bg-emerald-50 dark:bg-emerald-900/30",
  purple: "bg-purple-50 dark:bg-purple-900/30",
};

const iconColorMap = {
  default: "text-slate-600 dark:text-slate-300",
  yellow: "text-amber-600 dark:text-amber-400",
  blue: "text-blue-600 dark:text-blue-400",
  red: "text-red-600 dark:text-red-400",
  green: "text-emerald-600 dark:text-emerald-400",
  purple: "text-purple-600 dark:text-purple-400",
};

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{display}</span>;
}

export function ModernStatsCard({
  title,
  value,
  icon,
  color = "default",
  gradient = false,
  pulse = false,
  delay = 0,
  trend,
}: ModernStatsCardProps) {
  if (gradient) {
    return (
      <div
        className="relative group animate-fade-in-up animate-fill-both"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div
          className={cn(
            "absolute -inset-0.5 bg-gradient-to-r rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-500",
            gradientMap[color]
          )}
        />
        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                {title}
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                <AnimatedNumber value={value} />
              </p>
              {trend && (
                <div className="mt-2 flex items-center gap-1">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">vs last month</span>
                </div>
              )}
            </div>
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
                iconBgMap[color],
                pulse && "animate-pulse"
              )}
            >
              <div className={iconColorMap[color]}>{icon}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 animate-fade-in-up animate-fill-both"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            <AnimatedNumber value={value} />
          </p>
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">vs last month</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-xl transition-transform duration-300 hover:scale-110",
            iconBgMap[color],
            pulse && "animate-pulse"
          )}
        >
          <div className={iconColorMap[color]}>{icon}</div>
        </div>
      </div>
    </div>
  );
}
