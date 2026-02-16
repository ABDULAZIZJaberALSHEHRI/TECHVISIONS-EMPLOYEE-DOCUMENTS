"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image as ImageIcon, FileArchive, Eye, Loader2 } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  note: string | null;
  version: number;
  createdAt: string;
}

interface ViewSubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  assignmentId: string;
  documents: Document[];
}

export function ViewSubmissionModal({
  open,
  onOpenChange,
  employeeName,
  assignmentId,
  documents,
}: ViewSubmissionModalProps) {
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
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
      toast({ title: "Error", description: "Failed to download file", variant: "destructive" });
    } finally {
      setDownloading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-6 w-6 text-blue-500" />;
    }
    return <FileText className="h-6 w-6 text-gray-500 dark:text-slate-400" />;
  };

  const canPreviewInline = (mimeType: string) => {
    return mimeType.startsWith("image/") || mimeType === "application/pdf";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Submitted Documents — {employeeName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:border-gray-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* File Info */}
                  <div className="flex items-start gap-3 flex-1">
                    {getFileIcon(doc.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.fileName}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{formatBytes(doc.fileSize)}</span>
                        <span>•</span>
                        <span>v{doc.version}</span>
                        <span>•</span>
                        <span>{format(new Date(doc.createdAt), "MMM dd, yyyy HH:mm")}</span>
                      </div>
                      {doc.note && (
                        <p className="mt-2 text-xs text-muted-foreground italic">
                          Note: {doc.note}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:text-blue-700"
                      disabled={downloading[`doc-${doc.id}`]}
                      onClick={() =>
                        handleDownload(
                          `/api/documents/${doc.id}/download`,
                          doc.fileName,
                          `doc-${doc.id}`
                        )
                      }
                      title="Download file"
                    >
                      {downloading[`doc-${doc.id}`] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    {canPreviewInline(doc.mimeType) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:text-blue-700"
                        onClick={() => setPreviewDoc(doc)}
                        title="Preview file"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Inline Preview for Images */}
                {doc.mimeType.startsWith("image/") && (
                  <div className="mt-3">
                    <img
                      src={`/api/documents/${doc.id}/download?preview=true`}
                      alt={doc.fileName}
                      className="max-h-48 rounded-lg border border-gray-200 dark:border-slate-700 object-contain w-full bg-gray-50 dark:bg-slate-700"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Download All as ZIP */}
          {documents.length > 1 && (
            <div className="mt-6 pt-4 border-t">
              <Button
                disabled={downloading[`zip-${assignmentId}`]}
                onClick={() =>
                  handleDownload(
                    `/api/assignments/${assignmentId}/download-all`,
                    `${employeeName}_documents.zip`,
                    `zip-${assignmentId}`
                  )
                }
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {downloading[`zip-${assignmentId}`] ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileArchive className="mr-2 h-4 w-4" />
                )}
                {downloading[`zip-${assignmentId}`]
                  ? "Generating ZIP..."
                  : `Download All as ZIP (${documents.length} files)`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Preview Modal */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{previewDoc.fileName}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {previewDoc.mimeType === "application/pdf" ? (
                <iframe
                  src={`/api/documents/${previewDoc.id}/download?preview=true`}
                  className="w-full h-[70vh] rounded-lg border"
                  title={previewDoc.fileName}
                />
              ) : previewDoc.mimeType.startsWith("image/") ? (
                <div className="flex items-center justify-center bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <img
                    src={`/api/documents/${previewDoc.id}/download?preview=true`}
                    alt={previewDoc.fileName}
                    className="max-h-[70vh] max-w-full object-contain"
                  />
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
