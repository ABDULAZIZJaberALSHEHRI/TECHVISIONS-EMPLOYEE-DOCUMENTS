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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Download, Eye } from "lucide-react";
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
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleReview = async (action: "APPROVED" | "REJECTED") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments/${selectedAssignment}/review`, {
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
                      <p className="text-sm">{a.documents[0].fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        v{a.documents[0].version} ·{" "}
                        {format(
                          new Date(a.documents[0].createdAt),
                          "MMM dd, yyyy"
                        )}
                      </p>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            window.open(
                              `/api/documents/${a.documents[0].id}/download`,
                              "_blank"
                            )
                          }
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {a.status === "SUBMITTED" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700"
                          onClick={() => {
                            setSelectedAssignment(a.id);
                            setApproveDialogOpen(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => {
                            setSelectedAssignment(a.id);
                            setRejectDialogOpen(true);
                          }}
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
