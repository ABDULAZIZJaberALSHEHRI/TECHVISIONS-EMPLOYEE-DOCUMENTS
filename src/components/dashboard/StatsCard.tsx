"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: "default" | "yellow" | "blue" | "red" | "green";
  pulse?: boolean;
  delay?: number;
}

const colorMap = {
  default: "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700",
  yellow: "bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800",
  blue: "bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800",
  red: "bg-white dark:bg-slate-800 border-red-200 dark:border-red-800",
  green: "bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800",
};

const iconColorMap = {
  default: "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300",
  yellow: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  red: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  green: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
};

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 600;
    const steps = 20;
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

export function StatsCard({
  title,
  value,
  icon,
  color = "default",
  pulse = false,
  delay = 0,
}: StatsCardProps) {
  return (
    <Card
      className={cn(
        "border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 animate-fade-in-up animate-fill-both",
        colorMap[color]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="flex items-center gap-4 p-6">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200",
            iconColorMap[color],
            pulse && "animate-pulse-subtle"
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white animate-count-up">
            <AnimatedNumber value={value} />
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
