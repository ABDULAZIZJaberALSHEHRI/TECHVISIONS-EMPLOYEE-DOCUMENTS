"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FileUpload } from "@/components/documents/FileUpload";
import { DocumentList } from "@/components/documents/DocumentList";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { REQUEST_STATUS_CONFIG } from "@/lib/constants";
import { Calendar, FileText, Download, Paperclip } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Priority, RequestStatus, AssignmentStatus } from "@prisma/client";

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
  category: { name: string } | null;
  attachments: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }[];
  assignments: {
    id: string;
    status: AssignmentStatus;
    reviewNote: string | null;
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

export default function EmployeeRequestDetailPage() {
  const { id } = useParams();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    fileName: string;
    mimeType: string;
  } | null>(null);

  const fetchRequest = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${id}`);
      const data = await res.json();
      if (data.success) setRequest(data.data);
    } catch (error) {
      console.error("Failed to fetch request:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  if (loading) return <PageLoader />;
  if (!request) return <div>Request not found</div>;

  const assignment = request.assignments[0]; // Employee sees only their own
  const canUpload =
    request.status === "OPEN" &&
    assignment &&
    (assignment.status === "PENDING" ||
      assignment.status === "OVERDUE" ||
      assignment.status === "REJECTED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1B4F72]">{request.title}</h1>
        <div className="mt-2 flex items-center gap-3">
          <PriorityBadge priority={request.priority} />
          <Badge
            variant="secondary"
            className={REQUEST_STATUS_CONFIG[request.status].color}
          >
            {REQUEST_STATUS_CONFIG[request.status].label}
          </Badge>
          {request.category && (
            <Badge variant="outline">{request.category.name}</Badge>
          )}
          {assignment && <StatusBadge status={assignment.status} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Description */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm whitespace-pre-wrap">{request.description}</p>
            {request.notes && (
              <div>
                <p className="text-sm font-medium">Instructions:</p>
                <p className="text-sm text-muted-foreground">{request.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                Due: {format(new Date(request.deadline), "MMM dd, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>
                Formats: {request.acceptedFormats || "Any format accepted"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Max size: {request.maxFileSizeMb}MB</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Files */}
      {request.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Template / Reference Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {request.attachments.map((att) => (
                <Button
                  key={att.id}
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `/api/documents/${att.id}/download`,
                      "_blank"
                    )
                  }
                >
                  <Download className="mr-1 h-4 w-4" />
                  {att.fileName}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Area */}
      {canUpload && assignment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Document</CardTitle>
          </CardHeader>
          <CardContent>
            {assignment.status === "REJECTED" && assignment.reviewNote && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-700">
                  Previous submission was rejected:
                </p>
                <p className="text-sm text-red-600">{assignment.reviewNote}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Please re-upload with the requested changes.
                </p>
              </div>
            )}
            <FileUpload
              assignmentId={assignment.id}
              acceptedFormats={request.acceptedFormats || undefined}
              maxFileSizeMb={request.maxFileSizeMb}
              onUploadComplete={fetchRequest}
            />
          </CardContent>
        </Card>
      )}

      {/* Submitted Documents */}
      {assignment && assignment.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentList
              documents={assignment.documents}
              assignmentStatus={assignment.status}
              reviewNote={assignment.reviewNote}
              onPreview={(doc) =>
                setPreviewDoc({
                  id: doc.id,
                  fileName: doc.fileName,
                  mimeType: doc.mimeType,
                })
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewDoc?.fileName}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <DocumentPreview
              documentId={previewDoc.id}
              fileName={previewDoc.fileName}
              mimeType={previewDoc.mimeType}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
