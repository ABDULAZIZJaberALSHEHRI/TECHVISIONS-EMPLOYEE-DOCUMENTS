"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ArrowUpDown } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface RequestFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  priority: string;
  onPriorityChange: (value: string) => void;
  categoryId?: string;
  onCategoryChange?: (value: string) => void;
  sortBy?: string;
  onSortChange?: (value: string) => void;
  onClear: () => void;
}

export function RequestFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  categoryId,
  onCategoryChange,
  sortBy,
  onSortChange,
  onClear,
}: RequestFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const hasFilters = search || status || priority || (categoryId && categoryId !== "ALL");

  useEffect(() => {
    if (onCategoryChange) {
      fetch("/api/categories")
        .then((res) => res.json())
        .then((res) => {
          if (res.success) {
            setCategories(
              res.data.filter((c: Category & { isActive: boolean }) => c.isActive)
            );
          }
        });
    }
  }, [onCategoryChange]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search requests..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Status</SelectItem>
          <SelectItem value="OPEN">Open</SelectItem>
          <SelectItem value="PENDING_HR">Pending HR</SelectItem>
          <SelectItem value="CLOSED">Closed</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
        </SelectContent>
      </Select>
      <Select value={priority} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Priority</SelectItem>
          <SelectItem value="LOW">Low</SelectItem>
          <SelectItem value="MEDIUM">Medium</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="URGENT">Urgent</SelectItem>
        </SelectContent>
      </Select>
      {onCategoryChange && (
        <Select value={categoryId || "ALL"} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {onSortChange && (
        <Select value={sortBy || "newest"} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="deadline_asc">Deadline (Soonest)</SelectItem>
            <SelectItem value="deadline_desc">Deadline (Latest)</SelectItem>
            <SelectItem value="priority_desc">Priority (High → Low)</SelectItem>
            <SelectItem value="priority_asc">Priority (Low → High)</SelectItem>
            <SelectItem value="submissions_desc">Most Submissions</SelectItem>
            <SelectItem value="submissions_asc">Least Submissions</SelectItem>
          </SelectContent>
        </Select>
      )}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
