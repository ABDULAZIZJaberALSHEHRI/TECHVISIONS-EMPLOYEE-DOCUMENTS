"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: "default" | "yellow" | "blue" | "red" | "green";
  pulse?: boolean;
}

const colorMap = {
  default: "bg-gray-50 text-gray-700",
  yellow: "bg-yellow-50 text-yellow-700",
  blue: "bg-blue-50 text-blue-700",
  red: "bg-red-50 text-red-700",
  green: "bg-green-50 text-green-700",
};

const iconColorMap = {
  default: "bg-gray-100 text-gray-600",
  yellow: "bg-yellow-100 text-yellow-600",
  blue: "bg-blue-100 text-blue-600",
  red: "bg-red-100 text-red-600",
  green: "bg-green-100 text-green-600",
};

export function StatsCard({
  title,
  value,
  icon,
  color = "default",
  pulse = false,
}: StatsCardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", colorMap[color])}>
      <CardContent className="flex items-center gap-4 p-6">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            iconColorMap[color],
            pulse && "animate-pulse"
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
