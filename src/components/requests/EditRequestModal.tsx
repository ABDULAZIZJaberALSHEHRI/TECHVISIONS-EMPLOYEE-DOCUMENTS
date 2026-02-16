"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { EmployeeSelector } from "./EmployeeSelector";
import { HRSelector } from "./HRSelector";
import { MyListsTab } from "./MyListsTab";
import { SaveListDialog } from "./SaveListDialog";
import {
  Loader2,
  Upload,
  X,
  FileText,
  Users,
  Plus,
  Trash2,
  BookmarkPlus,
  List,
  AlertTriangle,
} from "lucide-react";
import type { Priority, AssignmentStatus } from "@prisma/client";
import { DeadlinePicker } from "@/components/ui/deadline-picker";

interface DocumentSlot {
  id: string;
  name: string;
  templateId: string | null;
  sortOrder: number;
}

interface Category {
  id: string;
  name: string;
}

interface RequestDetail {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: string;
  deadline: string;
  acceptedFormats: string | null;
  maxFileSizeMb: number;
  notes: string | null;
  templateUrl: string | null;
  templateName: string | null;
  category: { id: string; name: string } | null;
  createdBy: { id: string; name: string; email: string };
  assignedTo?: { id: string; name: string; email: string } | null;
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
    employee: {
      id: string;
      name: string;
      email: string;
      department: string | null;
    };
    documents: { id: string }[];
  }[];
}

interface EditRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestDetail;
  onSuccess: () => void;
}

export function EditRequestModal({
  open,
  onOpenChange,
  request,
  onSuccess,
}: EditRequestModalProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description);
  const [notes, setNotes] = useState(request.notes || "");
  const [priority, setPriority] = useState<Priority>(request.priority);
  const [categoryId, setCategoryId] = useState(request.category?.id || "");
  const [deadline, setDeadline] = useState(
    request.deadline ? new Date(request.deadline).toISOString().split("T")[0] : ""
  );
  const [acceptedFormats, setAcceptedFormats] = useState(
    request.acceptedFormats || "pdf,jpg,jpeg,png,doc,docx"
  );
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(request.maxFileSizeMb || 10);
  const [assignedToId, setAssignedToId] = useState<string | undefined>(
    request.assignedTo?.id || undefined
  );

  // Document slots
  const [documentSlots, setDocumentSlots] = useState<{ name: string; templateId: string }[]>(
    request.documentSlots?.map((s) => ({ name: s.name, templateId: s.templateId || "" })) || [
      { name: "", templateId: "" },
    ]
  );

  // Template
  const [keepTemplate, setKeepTemplate] = useState(!!request.templateUrl);
  const [newTemplateFile, setNewTemplateFile] = useState<File | null>(null);

  // Attachments
  const [existingAttachments, setExistingAttachments] = useState(request.attachments || []);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);

  // Employees
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(
    request.assignments.map((a) => a.employee.id)
  );
  const [targetType, setTargetType] = useState<"SPECIFIC" | "DEPARTMENT" | "ALL_EMPLOYEES">("SPECIFIC");
  const [activeTab, setActiveTab] = useState<"SPECIFIC" | "DEPARTMENT" | "ALL_EMPLOYEES" | "MY_LISTS">("SPECIFIC");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [employeeCount, setEmployeeCount] = useState<number | null>(selectedEmployees.length);
  const [saveListDialogOpen, setSaveListDialogOpen] = useState(false);
  const [listsRefreshKey, setListsRefreshKey] = useState(0);

  const userRole = session?.user?.role;
  const currentUserId = session?.user?.id;
  const managedDept = session?.user?.managedDepartment;
  const isDeptHead = userRole === "DEPARTMENT_HEAD";

  // Submission count
  const submissionCount = request.assignments.filter(
    (a) => a.documents.length > 0
  ).length;

  // Reset form when request changes or modal opens
  useEffect(() => {
    if (open) {
      setTitle(request.title);
      setDescription(request.description);
      setNotes(request.notes || "");
      setPriority(request.priority);
      setCategoryId(request.category?.id || "");
      setDeadline(
        request.deadline ? new Date(request.deadline).toISOString().split("T")[0] : ""
      );
      setAcceptedFormats(request.acceptedFormats || "pdf,jpg,jpeg,png,doc,docx");
      setMaxFileSizeMb(request.maxFileSizeMb || 10);
      setAssignedToId(request.assignedTo?.id || undefined);
      setDocumentSlots(
        request.documentSlots?.map((s) => ({ name: s.name, templateId: s.templateId || "" })) || [
          { name: "", templateId: "" },
        ]
      );
      setKeepTemplate(!!request.templateUrl);
      setNewTemplateFile(null);
      setExistingAttachments(request.attachments || []);
      setRemovedAttachmentIds([]);
      setNewAttachmentFiles([]);
      setSelectedEmployees(request.assignments.map((a) => a.employee.id));
      setTargetType("SPECIFIC");
      setActiveTab("SPECIFIC");
      setSelectedDepartments([]);
    }
  }, [open, request]);

  // Fetch categories and departments
  useEffect(() => {
    if (!open) return;
    fetch("/api/categories")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setCategories(res.data.filter((c: Category & { isActive: boolean }) => c.isActive));
        }
      });
    fetch("/api/departments")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setDepartments(res.departments);
      });
  }, [open]);

  // Employee count preview
  useEffect(() => {
    if (!open) return;
    const fetchCount = async () => {
      if (targetType === "ALL_EMPLOYEES") {
        const res = await fetch("/api/users?countOnly=true");
        const data = await res.json();
        let total = data.total || data.data?.length || 0;
        if (currentUserId && total > 0) total -= 1;
        setEmployeeCount(total);
      } else if (targetType === "DEPARTMENT" && selectedDepartments.length > 0) {
        let count = 0;
        for (const dept of selectedDepartments) {
          const res = await fetch(`/api/departments/members?department=${encodeURIComponent(dept)}`);
          const data = await res.json();
          if (data.success) {
            const members = currentUserId
              ? data.employees.filter((e: { id: string }) => e.id !== currentUserId)
              : data.employees;
            count += members.length;
          }
        }
        setEmployeeCount(count);
      } else if (targetType === "SPECIFIC") {
        setEmployeeCount(selectedEmployees.length);
      } else {
        setEmployeeCount(null);
      }
    };
    fetchCount();
  }, [open, targetType, selectedDepartments, selectedEmployees, currentUserId]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Template file must be under 10MB",
          variant: "destructive",
        });
        return;
      }
      setNewTemplateFile(file);
      setKeepTemplate(false);
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setRemovedAttachmentIds((prev) => [...prev, attId]);
    setExistingAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleNewAttachments = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewAttachmentFiles(Array.from(e.target.files));
    }
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Error", description: "Description is required", variant: "destructive" });
      return;
    }
    if (!deadline) {
      toast({ title: "Error", description: "Deadline is required", variant: "destructive" });
      return;
    }

    const validSlots = documentSlots.filter((s) => s.name.trim());
    if (validSlots.length === 0) {
      toast({ title: "Error", description: "At least one required document is needed", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("description", description);
      formData.set("priority", priority);
      formData.set("deadline", deadline);
      formData.set("acceptedFormats", acceptedFormats);
      formData.set("maxFileSizeMb", String(maxFileSizeMb));
      formData.set("categoryId", categoryId || "");
      formData.set("notes", notes);
      formData.set("documentSlots", JSON.stringify(validSlots));
      formData.set("employeeIds", JSON.stringify(selectedEmployees));

      if (assignedToId) {
        formData.set("assignedToId", assignedToId);
      } else {
        formData.set("assignedToId", "");
      }

      // Template handling
      if (!keepTemplate && !newTemplateFile) {
        formData.set("removeTemplate", "true");
      }
      if (newTemplateFile) {
        formData.set("templateFile", newTemplateFile);
      }

      // Attachment handling
      if (removedAttachmentIds.length > 0) {
        formData.set("removedAttachmentIds", JSON.stringify(removedAttachmentIds));
      }
      for (const file of newAttachmentFiles) {
        formData.append("attachments", file);
      }

      const res = await fetch(`/api/requests/${request.id}`, {
        method: "PATCH",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: "Success", description: "Request updated successfully" });
        onOpenChange(false);
        onSuccess();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update request",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Request</DialogTitle>
          </DialogHeader>

          {/* Submission Warning */}
          {submissionCount > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  This request has {submissionCount} submission(s).
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Editing may affect existing submissions. Removing employees will delete their submissions.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-6 mt-2">
            {/* Request Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={categoryId || "NONE"} onValueChange={(v) => setCategoryId(v === "NONE" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No Category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority *</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Deadline *</Label>
                <DeadlinePicker
                  value={deadline}
                  onChange={setDeadline}
                />
              </div>
              <div>
                <Label htmlFor="edit-maxsize">Max File Size (MB)</Label>
                <Input
                  id="edit-maxsize"
                  type="number"
                  min={1}
                  max={100}
                  value={maxFileSizeMb}
                  onChange={(e) => setMaxFileSizeMb(parseInt(e.target.value) || 10)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="edit-formats">Accepted Formats (comma-separated)</Label>
                <Input
                  id="edit-formats"
                  value={acceptedFormats}
                  onChange={(e) => setAcceptedFormats(e.target.value)}
                  placeholder="pdf,jpg,png,doc,docx"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="edit-notes">Additional Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Template File */}
            <div>
              <Label>Template File</Label>
              {keepTemplate && request.templateName && !newTemplateFile ? (
                <div className="mt-1 flex items-center gap-2 rounded-lg border bg-blue-50 p-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium flex-1 truncate">
                    {request.templateName}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setKeepTemplate(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : newTemplateFile ? (
                <div className="mt-1 flex items-center gap-2 rounded-lg border bg-green-50 p-3">
                  <FileText className="h-5 w-5 text-green-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{newTemplateFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(newTemplateFile.size / 1024 / 1024).toFixed(2)} MB (new)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNewTemplateFile(null);
                      setKeepTemplate(!!request.templateUrl);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="mt-1">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                    <Upload className="h-5 w-5" />
                    <span>Upload a template file (PDF, DOCX, XLSX, up to 10MB)</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      onChange={handleTemplateChange}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Attachments */}
            <div>
              <Label>Attachments</Label>
              {existingAttachments.length > 0 && (
                <div className="mt-1 space-y-2">
                  {existingAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 rounded-lg border p-2"
                    >
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm flex-1 truncate">{att.fileName}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveAttachment(att.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2">
                <Input
                  type="file"
                  multiple
                  className="cursor-pointer"
                  onChange={handleNewAttachments}
                />
              </div>
            </div>

            {/* HR Selector */}
            {(userRole === "ADMIN" || userRole === "DEPARTMENT_HEAD" || userRole === "HR") && (
              <HRSelector
                value={assignedToId}
                onChange={setAssignedToId}
                excludeUserId={currentUserId}
              />
            )}

            {/* Required Documents */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Required Documents</Label>
                <Badge variant="secondary">{documentSlots.length} / 5</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Define which documents employees need to submit (1 to 5).
              </p>
              <div className="space-y-2">
                {documentSlots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                      {index + 1}
                    </span>
                    <Input
                      placeholder="Document name (e.g., National ID Copy)"
                      value={slot.name}
                      onChange={(e) => {
                        const updated = [...documentSlots];
                        updated[index] = { ...updated[index], name: e.target.value };
                        setDocumentSlots(updated);
                      }}
                    />
                    {documentSlots.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-red-500 hover:text-red-700"
                        onClick={() =>
                          setDocumentSlots(documentSlots.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {documentSlots.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDocumentSlots([...documentSlots, { name: "", templateId: "" }])
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Document Slot
                  </Button>
                )}
              </div>
            </div>

            {/* Employee Assignment */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Assign To</Label>
                {employeeCount !== null && (
                  <Badge variant="secondary">
                    <Users className="mr-1 h-3 w-3" />
                    {employeeCount} employee{employeeCount !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Button
                  type="button"
                  variant={activeTab === "SPECIFIC" ? "default" : "outline"}
                  onClick={() => { setActiveTab("SPECIFIC"); setTargetType("SPECIFIC"); }}
                  size="sm"
                >
                  Select Employees
                </Button>
                <Button
                  type="button"
                  variant={activeTab === "DEPARTMENT" ? "default" : "outline"}
                  onClick={() => { setActiveTab("DEPARTMENT"); setTargetType("DEPARTMENT"); }}
                  size="sm"
                >
                  By Department
                </Button>
                {!isDeptHead && (
                  <Button
                    type="button"
                    variant={activeTab === "ALL_EMPLOYEES" ? "default" : "outline"}
                    onClick={() => { setActiveTab("ALL_EMPLOYEES"); setTargetType("ALL_EMPLOYEES"); }}
                    size="sm"
                  >
                    All Employees
                  </Button>
                )}
                <Button
                  type="button"
                  variant={activeTab === "MY_LISTS" ? "default" : "outline"}
                  onClick={() => setActiveTab("MY_LISTS")}
                  size="sm"
                >
                  <List className="mr-1 h-4 w-4" />
                  My Lists
                </Button>
              </div>

              {activeTab === "SPECIFIC" && (
                <>
                  <EmployeeSelector
                    selectedIds={selectedEmployees}
                    onChange={setSelectedEmployees}
                    departmentFilter={isDeptHead ? managedDept || undefined : undefined}
                    excludeUserId={currentUserId}
                  />
                  {selectedEmployees.length > 0 && (
                    <div className="flex justify-end mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSaveListDialogOpen(true)}
                      >
                        <BookmarkPlus className="mr-1 h-4 w-4" />
                        Save as List
                      </Button>
                    </div>
                  )}
                </>
              )}

              {activeTab === "DEPARTMENT" && (
                <div className="space-y-3">
                  <Label>Select Departments</Label>
                  {isDeptHead && managedDept ? (
                    <div className="rounded-lg border bg-blue-50 p-3">
                      <Badge>{managedDept}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        As Department Head, requests are for your department only.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {departments.map((dept) => (
                        <Button
                          key={dept}
                          type="button"
                          variant={selectedDepartments.includes(dept) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleDepartment(dept)}
                        >
                          {dept}
                        </Button>
                      ))}
                      {departments.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No departments found.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "ALL_EMPLOYEES" && (
                <div className="rounded-lg border bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-800">
                    This request will be assigned to all active employees.
                  </p>
                  <p className="mt-1 text-xs text-amber-600">
                    {employeeCount !== null && `${employeeCount} employees will be assigned.`}
                  </p>
                </div>
              )}

              {activeTab === "MY_LISTS" && (
                <MyListsTab
                  onSelectList={(ids) => {
                    setSelectedEmployees(ids);
                    setTargetType("SPECIFIC");
                    setActiveTab("SPECIFIC");
                  }}
                  excludeUserId={currentUserId}
                  departmentFilter={isDeptHead ? managedDept || undefined : undefined}
                  refreshKey={listsRefreshKey}
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SaveListDialog
        open={saveListDialogOpen}
        onOpenChange={setSaveListDialogOpen}
        selectedEmployeeIds={selectedEmployees}
        onSaved={() => setListsRefreshKey((k) => k + 1)}
      />
    </>
  );
}
