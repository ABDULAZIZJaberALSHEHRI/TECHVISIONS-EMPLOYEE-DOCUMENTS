"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getInitials } from "@/lib/utils";
import { format } from "date-fns";
import { Mail, Building, Briefcase, Calendar } from "lucide-react";
import type { AssignmentStatus, Priority } from "@prisma/client";

interface EmployeeProfileProps {
  user: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    jobTitle: string | null;
    role: string;
    isActive: boolean;
    avatarUrl: string | null;
    createdAt: string;
    _count: {
      assignments: number;
      documents: number;
    };
  };
  assignments: {
    id: string;
    status: AssignmentStatus;
    dueDate: string;
    request: {
      id: string;
      title: string;
      priority: Priority;
    };
  }[];
}

export function EmployeeProfile({ user, assignments }: EmployeeProfileProps) {
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback className="bg-[#1B4F72] text-white text-xl">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{user.name}</h2>
              <Badge variant="secondary">{user.role}</Badge>
              <Badge
                variant="secondary"
                className={
                  user.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }
              >
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" /> {user.email}
              </span>
              {user.department && (
                <span className="flex items-center gap-1">
                  <Building className="h-4 w-4" /> {user.department}
                </span>
              )}
              {user.jobTitle && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" /> {user.jobTitle}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Joined{" "}
                {format(new Date(user.createdAt), "MMM dd, yyyy")}
              </span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{user._count.assignments}</p>
            <p className="text-xs text-muted-foreground">Assignments</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{user._count.documents}</p>
            <p className="text-xs text-muted-foreground">Documents</p>
          </div>
        </CardContent>
      </Card>

      {/* Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{a.request.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {format(new Date(a.dueDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
