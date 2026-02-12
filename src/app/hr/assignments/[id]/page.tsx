"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { AssignmentTable } from "@/components/requests/AssignmentTable";
import { FileUpload } from "@/components/documents/FileUpload";
import { REQUEST_STATUS_CONFIG } from "@/lib/constants";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, FileText, Users } from "lucide-react";
import { format } from "date-fns";
import type { AssignmentStatus, Priority, RequestStatus } from "@prisma/client";

interface DocumentSlot {
  id: string;
  name: string;
  templateId: string | null;
  sortOrder: number;
}

interface RequestDetail {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: RequestStatus;
  deadline: string;
  acceptedFormats: string | null;
  maxFileSizeMb: number;
  notes: string | null;
  createdAt: string;
  category: { id: string; name: string } | null;
  createdBy: { id: string; name: string; email: string };
  assignedTo: { id: string; name: string; email: string } | null;
  documentSlots?: DocumentSlot[];
  attachments: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }[];
  assignments: {
    id: string;
    status: AssignmentStatus;
    dueDate: string;
    reviewNote: string | null;
    reviewedAt: string | null;
    employee: {
      id: string;
      name: string;
      email: string;
      department: string | null;
    };
    reviewedBy: { id: string; name: string } | null;
    documents: {
      id: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      note: string | null;
      version: number;
      createdAt: string;
    }[];
  }[];
}

export default function HRAssignmentDetailPage() {
  const { id } = useParams();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");

  const fetchRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hr/assignments/${id}`);
      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
      } else {
        setRequest(null);
        setError(data.error || "Request not found");
      }
    } catch {
      setRequest(null);
      setError("Failed to fetch request");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const uploadAssignmentId = useMemo(() => {
    if (selectedAssignmentId) return selectedAssignmentId;
    return request?.assignments[0]?.id || "";
  }, [request, selectedAssignmentId]);

  useEffect(() => {
    if (!selectedAssignmentId && request?.assignments?.length) {
      setSelectedAssignmentId(request.assignments[0].id);
    }
  }, [request, selectedAssignmentId]);

  if (loading) return <PageLoader />;
  if (!request)
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{error || "Request not found"}</p>
      </div>
    );

  const statusConfig = REQUEST_STATUS_CONFIG[request.status];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
          <div className="mt-2 flex items-center gap-3">
            <PriorityBadge priority={request.priority} />
            <Badge variant="secondary" className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
            {request.category && (
              <Badge variant="outline">{request.category.name}</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm whitespace-pre-wrap">{request.description}</p>
            {request.notes && (
              <div>
                <p className="text-sm font-medium">Notes:</p>
                <p className="text-sm text-muted-foreground">{request.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Deadline: {format(new Date(request.deadline), "MMM dd, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{request.assignments.length} employees assigned</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Formats: {request.acceptedFormats || "Any"}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Max size: {request.maxFileSizeMb}MB</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {request.documentSlots && request.documentSlots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Required Documents ({request.documentSlots.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {request.documentSlots.map((slot, index) => (
                <div
                  key={slot.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{slot.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submission Area</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Upload Against Assignment</Label>
            <Select
              value={uploadAssignmentId}
              onValueChange={setSelectedAssignmentId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignment" />
              </SelectTrigger>
              <SelectContent>
                {request.assignments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {uploadAssignmentId ? (
            <FileUpload
              assignmentId={uploadAssignmentId}
              acceptedFormats={request.acceptedFormats || undefined}
              maxFileSizeMb={request.maxFileSizeMb}
              onUploadComplete={fetchRequest}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No assignment available for upload.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignmentTable assignments={request.assignments} onReviewComplete={fetchRequest} />
        </CardContent>
      </Card>
    </div>
  );
}

