"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { EmployeeSelector } from "./EmployeeSelector";
import { Loader2, Upload, X, FileText, Users, Plus, Trash2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface RequestFormProps {
  redirectPath?: string;
}

export function RequestForm({ redirectPath = "/hr/requests" }: RequestFormProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [targetType, setTargetType] = useState<"SPECIFIC" | "DEPARTMENT" | "ALL_EMPLOYEES">("SPECIFIC");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [documentSlots, setDocumentSlots] = useState<{ name: string; templateId: string }[]>([
    { name: "", templateId: "" },
  ]);
  const { toast } = useToast();
  const router = useRouter();

  const userRole = session?.user?.role;
  const managedDept = session?.user?.managedDepartment;

  // Dept heads can only use DEPARTMENT and SPECIFIC
  const isDeptHead = userRole === "DEPARTMENT_HEAD";

  useEffect(() => {
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
  }, []);

  // Auto-select managed department for dept heads
  useEffect(() => {
    if (isDeptHead && managedDept) {
      setTargetType("DEPARTMENT");
      setSelectedDepartments([managedDept]);
    }
  }, [isDeptHead, managedDept]);

  // Fetch employee count preview
  useEffect(() => {
    const fetchCount = async () => {
      if (targetType === "ALL_EMPLOYEES") {
        const res = await fetch("/api/users?countOnly=true");
        const data = await res.json();
        setEmployeeCount(data.total || data.data?.length || 0);
      } else if (targetType === "DEPARTMENT" && selectedDepartments.length > 0) {
        let count = 0;
        for (const dept of selectedDepartments) {
          const res = await fetch(`/api/departments/members?department=${encodeURIComponent(dept)}`);
          const data = await res.json();
          if (data.success) count += data.employees.length;
        }
        setEmployeeCount(count);
      } else if (targetType === "SPECIFIC") {
        setEmployeeCount(selectedEmployees.length);
      } else {
        setEmployeeCount(null);
      }
    };
    fetchCount();
  }, [targetType, selectedDepartments, selectedEmployees]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("targetType", targetType);
    formData.set("employeeIds", JSON.stringify(selectedEmployees));
    formData.set("targetDepartments", JSON.stringify(selectedDepartments));
    formData.set("assignAll", String(targetType === "ALL_EMPLOYEES"));

    if (targetType === "DEPARTMENT" && selectedDepartments.length === 1) {
      formData.set("department", selectedDepartments[0]);
    }

    if (templateFile) {
      formData.set("templateFile", templateFile);
    }

    // Add document slots (filter out empty names)
    const validSlots = documentSlots.filter((s) => s.name.trim());
    if (validSlots.length > 0) {
      formData.set("documentSlots", JSON.stringify(validSlots));
    }

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: "Success", description: "Request created successfully" });
        router.push(redirectPath);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create request",
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
      setLoading(false);
    }
  };

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
      setTemplateFile(file);
    }
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" required maxLength={200} />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                required
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="categoryId">Category</Label>
              <Select name="categoryId">
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="deadline">Deadline *</Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority *</Label>
              <Select name="priority" defaultValue="MEDIUM">
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
              <Label htmlFor="acceptedFormats">
                Accepted Formats (comma-separated)
              </Label>
              <Input
                id="acceptedFormats"
                name="acceptedFormats"
                placeholder="pdf,jpg,png,doc,docx"
                defaultValue="pdf,jpg,jpeg,png,doc,docx"
              />
            </div>
            <div>
              <Label htmlFor="maxFileSizeMb">Max File Size (MB)</Label>
              <Input
                id="maxFileSizeMb"
                name="maxFileSizeMb"
                type="number"
                min={1}
                max={100}
                defaultValue={10}
              />
            </div>

            {/* Template File Upload */}
            <div>
              <Label>Template File (optional)</Label>
              {templateFile ? (
                <div className="mt-1 flex items-center gap-2 rounded-lg border bg-blue-50 p-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {templateFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(templateFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setTemplateFile(null)}
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
              <p className="mt-1 text-xs text-muted-foreground">
                Employees can download this as a reference
              </p>
            </div>

            <div>
              <Label htmlFor="attachments">
                Additional Attachments
              </Label>
              <Input
                id="attachments"
                name="attachments"
                type="file"
                multiple
                className="cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Required Documents */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Required Documents</span>
              <Badge variant="secondary">{documentSlots.length} / 5</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Define which documents employees need to submit (1 to 5).
            </p>
            {documentSlots.map((slot, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                  {index + 1}
                </span>
                <Input
                  placeholder={`Document name (e.g., National ID Copy)`}
                  value={slot.name}
                  onChange={(e) => {
                    const updated = [...documentSlots];
                    updated[index] = { ...updated[index], name: e.target.value };
                    setDocumentSlots(updated);
                  }}
                  required
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
          </CardContent>
        </Card>

        {/* Employee Assignment */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Assign To</span>
              {employeeCount !== null && (
                <Badge variant="secondary" className="ml-2">
                  <Users className="mr-1 h-3 w-3" />
                  {employeeCount} employee{employeeCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                type="button"
                variant={targetType === "SPECIFIC" ? "default" : "outline"}
                onClick={() => setTargetType("SPECIFIC")}
                size="sm"
              >
                Select Employees
              </Button>
              <Button
                type="button"
                variant={targetType === "DEPARTMENT" ? "default" : "outline"}
                onClick={() => setTargetType("DEPARTMENT")}
                size="sm"
              >
                By Department
              </Button>
              {!isDeptHead && (
                <Button
                  type="button"
                  variant={targetType === "ALL_EMPLOYEES" ? "default" : "outline"}
                  onClick={() => setTargetType("ALL_EMPLOYEES")}
                  size="sm"
                >
                  All Employees
                </Button>
              )}
            </div>

            {targetType === "SPECIFIC" && (
              <EmployeeSelector
                selectedIds={selectedEmployees}
                onChange={setSelectedEmployees}
                departmentFilter={isDeptHead ? managedDept || undefined : undefined}
              />
            )}

            {targetType === "DEPARTMENT" && (
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
                        No departments found. Assign departments to users first.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {targetType === "ALL_EMPLOYEES" && (
              <div className="rounded-lg border bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800">
                  This request will be assigned to all active employees.
                </p>
                <p className="mt-1 text-xs text-amber-600">
                  {employeeCount !== null && `${employeeCount} employees will be assigned.`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Request
        </Button>
      </div>
    </form>
  );
}
