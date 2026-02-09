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
  default: "bg-white border-gray-200",
  yellow: "bg-white border-amber-200",
  blue: "bg-white border-blue-200",
  red: "bg-white border-red-200",
  green: "bg-white border-emerald-200",
};

const iconColorMap = {
  default: "bg-gray-100 text-gray-600",
  yellow: "bg-amber-50 text-amber-600",
  blue: "bg-blue-50 text-blue-600",
  red: "bg-red-50 text-red-600",
  green: "bg-emerald-50 text-emerald-600",
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
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 animate-count-up">
            <AnimatedNumber value={value} />
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
