"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Upload, X, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";

interface DocumentSlot {
  id: string;
  name: string;
  sortOrder: number;
}

interface MultiSlotFileUploadProps {
  assignmentId: string;
  documentSlots: DocumentSlot[];
  acceptedFormats?: string;
  maxFileSizeMb?: number;
  onUploadComplete: () => void;
}

interface SlotFile {
  file: File;
  note: string;
  uploaded: boolean;
  uploading: boolean;
  progress: number;
}

export function MultiSlotFileUpload({
  assignmentId,
  documentSlots,
  acceptedFormats,
  maxFileSizeMb = 10,
  onUploadComplete,
}: MultiSlotFileUploadProps) {
  const [slotFiles, setSlotFiles] = useState<Record<string, SlotFile>>({});
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { toast } = useToast();

  const acceptString = acceptedFormats
    ? acceptedFormats
        .split(",")
        .map((f) => `.${f.trim()}`)
        .join(",")
    : undefined;

  const handleFile = useCallback(
    (slotId: string, file: File) => {
      if (file.size > maxFileSizeMb * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `Maximum size is ${maxFileSizeMb}MB`,
          variant: "destructive",
        });
        return;
      }
      setSlotFiles((prev) => ({
        ...prev,
        [slotId]: {
          file,
          note: "",
          uploaded: false,
          uploading: false,
          progress: 0,
        },
      }));
    },
    [maxFileSizeMb, toast]
  );

  const handleDrop = useCallback(
    (slotId: string) => (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverSlot(null);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(slotId, file);
    },
    [handleFile]
  );

  const removeFile = useCallback((slotId: string) => {
    setSlotFiles((prev) => {
      const newSlots = { ...prev };
      delete newSlots[slotId];
      return newSlots;
    });
  }, []);

  const updateNote = useCallback((slotId: string, note: string) => {
    setSlotFiles((prev) => ({
      ...prev,
      [slotId]: { ...prev[slotId], note },
    }));
  }, []);

  const uploadSlotFile = async (slotId: string) => {
    const slotFile = slotFiles[slotId];
    if (!slotFile || slotFile.uploaded) return;

    setSlotFiles((prev) => ({
      ...prev,
      [slotId]: { ...prev[slotId], uploading: true, progress: 0 },
    }));

    const formData = new FormData();
    formData.append("file", slotFile.file);
    formData.append("documentSlotId", slotId);
    if (slotFile.note.trim()) formData.append("note", slotFile.note);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSlotFiles((prev) => ({
          ...prev,
          [slotId]: {
            ...prev[slotId],
            progress: Math.min(prev[slotId].progress + 10, 90),
          },
        }));
      }, 200);

      const res = await fetch(`/api/assignments/${assignmentId}/upload`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      const data = await res.json();

      if (data.success) {
        setSlotFiles((prev) => ({
          ...prev,
          [slotId]: {
            ...prev[slotId],
            uploading: false,
            uploaded: true,
            progress: 100,
          },
        }));
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
      setSlotFiles((prev) => ({
        ...prev,
        [slotId]: { ...prev[slotId], uploading: false, progress: 0 },
      }));
    }
  };

  const handleSubmitAll = async () => {
    setSubmitting(true);

    try {
      // Upload all files sequentially
      for (const slot of documentSlots) {
        if (slotFiles[slot.id] && !slotFiles[slot.id].uploaded) {
          await uploadSlotFile(slot.id);
        }
      }

      toast({
        title: "Success",
        description: "All documents uploaded successfully",
      });
      onUploadComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Some files failed to upload",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const allSlotsHaveFiles = documentSlots.every((slot) => slotFiles[slot.id]);
  const allSlotsUploaded = documentSlots.every(
    (slot) => slotFiles[slot.id]?.uploaded
  );

  return (
    <div className="space-y-6">
      {/* Individual Upload Slots */}
      {documentSlots.map((slot, index) => {
        const slotFile = slotFiles[slot.id];

        return (
          <div
            key={slot.id}
            className="rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-gray-300"
          >
            {/* Slot Header */}
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                {index + 1}
              </span>
              <h4 className="text-sm font-semibold text-gray-900">{slot.name}</h4>
              {slotFile?.uploaded && (
                <CheckCircle2 className="h-5 w-5 text-green-600 ml-auto" />
              )}
            </div>

            {/* Drop Zone or Uploaded File Display */}
            {!slotFile?.uploaded ? (
              <>
                <div
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer",
                    dragOverSlot === slot.id
                      ? "border-blue-500 bg-blue-50"
                      : slotFile
                      ? "border-green-500 bg-green-50"
                      : "border-gray-300 hover:border-gray-400"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverSlot(slot.id);
                  }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={handleDrop(slot.id)}
                  onClick={() => inputRefs.current[slot.id]?.click()}
                >
                  <input
                    ref={(el) => {
                      inputRefs.current[slot.id] = el;
                    }}
                    type="file"
                    className="hidden"
                    accept={acceptString}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(slot.id, file);
                    }}
                  />
                  {slotFile ? (
                    <div className="flex items-center gap-3 w-full">
                      <FileText className="h-8 w-8 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{slotFile.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(slotFile.file.size)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(slot.id);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium text-center">
                        Drag and drop your file, or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground text-center">
                        {acceptedFormats
                          ? `Accepted: ${acceptedFormats}`
                          : "All file types accepted"}
                        {" · "}Max size: {maxFileSizeMb}MB
                      </p>
                    </>
                  )}
                </div>

                {/* Progress Bar */}
                {slotFile?.uploading && (
                  <div className="mt-3 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${slotFile.progress}%` }}
                    />
                  </div>
                )}

                {/* Note Field */}
                {slotFile && !slotFile.uploading && (
                  <div className="mt-3">
                    <Label htmlFor={`note-${slot.id}`} className="text-xs">
                      Note (optional)
                    </Label>
                    <Textarea
                      id={`note-${slot.id}`}
                      value={slotFile.note}
                      onChange={(e) => updateNote(slot.id, e.target.value)}
                      placeholder="Add a note about this document..."
                      rows={2}
                      className="mt-1 text-sm"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">
                    {slotFile.file.name}
                  </p>
                  <p className="text-xs text-green-700">
                    Uploaded successfully · {formatBytes(slotFile.file.size)}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Submit All Button */}
      {allSlotsHaveFiles && !allSlotsUploaded && (
        <Button
          onClick={handleSubmitAll}
          disabled={submitting}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Uploading Documents...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Submit All Documents ({documentSlots.length})
            </>
          )}
        </Button>
      )}

      {/* Validation Message */}
      {!allSlotsHaveFiles && (
        <p className="text-sm text-amber-600 text-center">
          Please attach a file to all {documentSlots.length} required document slots
        </p>
      )}
    </div>
  );
}
