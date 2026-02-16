"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { AssignmentTable } from "@/components/requests/AssignmentTable";
import { EditRequestModal } from "@/components/requests/EditRequestModal";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/ui/use-toast";
import { REQUEST_STATUS_CONFIG } from "@/lib/constants";
import {
  Calendar,
  Users,
  Download,
  Bell,
  FileText,
  Paperclip,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Priority, RequestStatus, AssignmentStatus } from "@prisma/client";

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
  templateUrl: string | null;
  templateName: string | null;
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

export default function RequestDetailPage() {
  const { id } = useParams();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    fileName: string;
    mimeType: string;
  } | null>(null);
  const [reminding, setReminding] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { data: session } = useSession();

  const isCreator = session?.user?.id === request?.createdBy.id;

  const fetchRequest = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${id}`);
      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
      } else {
        setError(data.error || "Failed to load request");
      }
    } catch (err) {
      console.error("Failed to fetch request:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: "Request deleted successfully" });
        router.push("/hr/requests");
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete request",
        variant: "destructive",
      });
    }
    setDeleting(false);
    setDeleteDialogOpen(false);
  };

  const handleRemind = async () => {
    setReminding(true);
    try {
      const res = await fetch(`/api/requests/${id}/remind`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: data.message });
      } else {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to send reminders",
        variant: "destructive",
      });
    }
    setReminding(false);
  };

  const [downloadingAll, setDownloadingAll] = useState(false);

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      const response = await fetch(`/api/requests/${id}/download`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Download failed" }));
        toast({ title: "Error", description: error.error || "Download failed", variant: "destructive" });
        return;
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const fileNameMatch = disposition?.match(/filename="?([^"]+)"?/);
      const fileName = fileNameMatch?.[1] || "documents.zip";

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast({ title: "Error", description: "Failed to download files", variant: "destructive" });
    } finally {
      setDownloadingAll(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!request)
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{error || "Request not found"}</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );

  const statusConfig = REQUEST_STATUS_CONFIG[request.status];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {request.title}
          </h1>
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
        <div className="flex gap-2">
          {isCreator && request.status !== "CANCELLED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(true)}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRemind} disabled={reminding}>
            <Bell className="mr-1 h-4 w-4" />
            {reminding ? "Sending..." : "Remind"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadAll} disabled={downloadingAll}>
            {downloadingAll ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            {downloadingAll ? "Downloading..." : "Download All"}
          </Button>
          {isCreator && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Details */}
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
            <div className="text-muted-foreground">
              Created by {request.createdBy.name} on{" "}
              {format(new Date(request.createdAt), "MMM dd, yyyy")}
            </div>
            {request.assignedTo && (
              <div className="font-medium text-purple-600">
                Assigned to: {request.assignedTo.name}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Template / Attachments */}
      {(() => {
        const validAttachments = request.attachments.filter((att) => att.fileName);
        const hasFiles = request.templateName || validAttachments.length > 0;
        if (!hasFiles) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Template / Reference Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {request.templateName && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `/api/requests/${request.id}/template`,
                        "_blank"
                      )
                    }
                  >
                    <FileText className="mr-1 h-4 w-4" />
                    {request.templateName}
                  </Button>
                )}
                {validAttachments.map((att) => (
                  <Button
                    key={att.id}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `/api/requests/${request.id}/attachments/${att.id}`,
                        "_blank"
                      )
                    }
                  >
                    <FileText className="mr-1 h-4 w-4" />
                    {att.fileName}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Document Slots */}
      {request.documentSlots && request.documentSlots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
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

      {/* Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignmentTable
            assignments={request.assignments}
            onReviewComplete={fetchRequest}
          />
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {request && (
        <EditRequestModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          request={request}
          onSuccess={fetchRequest}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Request"
        description="Are you sure you want to permanently delete this request? This will remove all assignments, submitted documents, and uploaded files. This action cannot be undone."
        confirmLabel="Delete Request"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Preview Dialog */}
      <Dialog
        open={!!previewDoc}
        onOpenChange={() => setPreviewDoc(null)}
      >
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
