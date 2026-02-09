"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatBytes } from "@/lib/utils";
import { Download, FileText, Eye } from "lucide-react";
import { format } from "date-fns";
import type { AssignmentStatus } from "@prisma/client";

interface DocumentItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  note: string | null;
  version: number;
  createdAt: string;
}

interface DocumentListProps {
  documents: DocumentItem[];
  assignmentStatus: AssignmentStatus;
  reviewNote?: string | null;
  onPreview?: (doc: DocumentItem) => void;
}

export function DocumentList({
  documents,
  assignmentStatus,
  reviewNote,
  onPreview,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No documents submitted yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm font-medium">{doc.fileName}</p>
              <p className="text-xs text-muted-foreground">
                v{doc.version} · {formatBytes(doc.fileSize)} ·{" "}
                {format(new Date(doc.createdAt), "MMM dd, yyyy HH:mm")}
              </p>
              {doc.note && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Note: {doc.note}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={assignmentStatus} />
            {onPreview && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPreview(doc)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                window.open(`/api/documents/${doc.id}/download`, "_blank")
              }
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      {assignmentStatus === "REJECTED" && reviewNote && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-700">Rejection Reason:</p>
          <p className="text-sm text-red-600">{reviewNote}</p>
        </div>
      )}
    </div>
  );
}
