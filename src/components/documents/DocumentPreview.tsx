"use client";

import { FileText, Image, File } from "lucide-react";

interface DocumentPreviewProps {
  documentId: string;
  fileName: string;
  mimeType: string;
}

export function DocumentPreview({
  documentId,
  fileName,
  mimeType,
}: DocumentPreviewProps) {
  const downloadUrl = `/api/documents/${documentId}/download`;

  if (mimeType === "application/pdf") {
    return (
      <div className="rounded-lg border overflow-hidden">
        <iframe
          src={downloadUrl}
          className="h-[500px] w-full"
          title={fileName}
        />
      </div>
    );
  }

  if (mimeType.startsWith("image/")) {
    return (
      <div className="rounded-lg border overflow-hidden flex items-center justify-center bg-gray-50 p-4">
        <img
          src={downloadUrl}
          alt={fileName}
          className="max-h-[500px] max-w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border bg-gray-50 p-8">
      <File className="mb-2 h-12 w-12 text-muted-foreground" />
      <p className="text-sm font-medium">{fileName}</p>
      <p className="text-xs text-muted-foreground">
        Preview not available for this file type
      </p>
    </div>
  );
}
