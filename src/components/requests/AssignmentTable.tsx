"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ViewSubmissionModal } from "./ViewSubmissionModal";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Download, Eye, FileArchive, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { AssignmentStatus } from "@prisma/client";

interface Assignment {
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
}

interface AssignmentTableProps {
  assignments: Assignment[];
  onReviewComplete: () => void;
}

export function AssignmentTable({
  assignments,
  onReviewComplete,
}: AssignmentTableProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleDownload = async (url: string, fallbackName: string, key: string) => {
    setDownloading((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Download failed" }));
        toast({ title: "Error", description: error.error || "Download failed", variant: "destructive" });
        return;
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const fileNameMatch = disposition?.match(/filename="?([^"]+)"?/);
      const fileName = fileNameMatch?.[1] || fallbackName;

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
      setDownloading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleReview = async (action: "APPROVED" | "REJECTED") => {
    if (!selectedAssignment) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments/${selectedAssignment.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          note: action === "REJECTED" ? rejectReason : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Success",
          description: `Submission ${action.toLowerCase()}`,
        });
        onReviewComplete();
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
        description: "Failed to process review",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRejectDialogOpen(false);
      setApproveDialogOpen(false);
      setRejectReason("");
      setSelectedAssignment(null);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{a.employee.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.employee.email}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {a.employee.department || "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={a.status} />
                </TableCell>
                <TableCell>
                  {a.documents.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium">
                        {a.documents.length} {a.documents.length === 1 ? "file" : "files"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(a.documents[0].createdAt),
                          "MMM dd, yyyy"
                        )}
                      </p>
                      {a.documents.length > 1 && (
                        <p className="text-xs text-blue-600 mt-1">
                          Multiple documents uploaded
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Not submitted
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(a.dueDate), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {a.documents.length > 0 && (
                      <>
                        {/* Eye Icon - View Files */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-600 hover:text-blue-600 transition-colors"
                          onClick={() => {
                            setSelectedAssignment(a);
                            setViewModalOpen(true);
                          }}
                          title="View files"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* Download Icon - Download Single or ZIP */}
                        {a.documents.length === 1 ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-600 hover:text-blue-600 transition-colors"
                            disabled={downloading[`doc-${a.documents[0].id}`]}
                            onClick={() =>
                              handleDownload(
                                `/api/documents/${a.documents[0].id}/download`,
                                a.documents[0].fileName,
                                `doc-${a.documents[0].id}`
                              )
                            }
                            title="Download file"
                          >
                            {downloading[`doc-${a.documents[0].id}`] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-600 hover:text-blue-600 transition-colors"
                            disabled={downloading[`zip-${a.id}`]}
                            onClick={() =>
                              handleDownload(
                                `/api/assignments/${a.id}/download-all`,
                                `${a.employee.name}_documents.zip`,
                                `zip-${a.id}`
                              )
                            }
                            title={`Download all ${a.documents.length} files as ZIP`}
                          >
                            {downloading[`zip-${a.id}`] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileArchive className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </>
                    )}

                    {/* Approve & Reject Icons */}
                    {a.status === "SUBMITTED" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-600 hover:text-green-600 transition-colors"
                          onClick={() => {
                            setSelectedAssignment(a);
                            setApproveDialogOpen(true);
                          }}
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-600 hover:text-red-600 transition-colors"
                          onClick={() => {
                            setSelectedAssignment(a);
                            setRejectDialogOpen(true);
                          }}
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View Submission Modal */}
      {selectedAssignment && (
        <ViewSubmissionModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          employeeName={selectedAssignment.employee.name}
          assignmentId={selectedAssignment.id}
          documents={selectedAssignment.documents}
        />
      )}

      <ConfirmDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        title="Approve Submission"
        description="Are you sure you want to approve this submission?"
        confirmLabel="Approve"
        onConfirm={() => handleReview("APPROVED")}
        loading={loading}
      />

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejection. This will be sent to the
              employee.
            </p>
            <Textarea
              placeholder="Rejection reason (required)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReview("REJECTED")}
              disabled={loading || !rejectReason.trim()}
            >
              {loading ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
