"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";

interface FileUploadProps {
  assignmentId: string;
  acceptedFormats?: string;
  maxFileSizeMb?: number;
  onUploadComplete: () => void;
}

export function FileUpload({
  assignmentId,
  acceptedFormats,
  maxFileSizeMb = 10,
  onUploadComplete,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const acceptString = acceptedFormats
    ? acceptedFormats
        .split(",")
        .map((f) => `.${f.trim()}`)
        .join(",")
    : undefined;

  const handleFile = useCallback(
    (f: File) => {
      if (f.size > maxFileSizeMb * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `Maximum size is ${maxFileSizeMb}MB`,
          variant: "destructive",
        });
        return;
      }
      setFile(f);
    },
    [maxFileSizeMb, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    if (note.trim()) formData.append("note", note);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 200);

      const res = await fetch(`/api/assignments/${assignmentId}/upload`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();

      if (data.success) {
        toast({ title: "Success", description: "Document uploaded successfully" });
        setFile(null);
        setNote("");
        onUploadComplete();
      } else {
        toast({
          title: "Upload failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          dragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400",
          file && "border-green-500 bg-green-50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptString}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {file ? (
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              {acceptedFormats
                ? `Accepted: ${acceptedFormats}`
                : "All file types accepted"}
              {" · "}Max size: {maxFileSizeMb}MB
            </p>
          </>
        )}
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Note */}
      {file && (
        <div>
          <Label htmlFor="upload-note">Note (optional)</Label>
          <Textarea
            id="upload-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about this document..."
            rows={2}
          />
        </div>
      )}

      {/* Upload button */}
      {file && (
        <Button onClick={handleUpload} disabled={uploading} className="w-full">
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </>
          )}
        </Button>
      )}
    </div>
  );
}
