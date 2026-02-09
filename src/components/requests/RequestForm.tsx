"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/components/ui/use-toast";
import { EmployeeSelector } from "./EmployeeSelector";
import { Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

export function RequestForm() {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [assignMode, setAssignMode] = useState<"select" | "department" | "all">("select");
  const [department, setDepartment] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setCategories(res.data.filter((c: Category & { isActive: boolean }) => c.isActive));
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("employeeIds", JSON.stringify(selectedEmployees));
    formData.set("assignAll", String(assignMode === "all"));
    if (assignMode === "department") {
      formData.set("department", department);
    }

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: "Success", description: "Request created successfully" });
        router.push("/hr/requests");
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
            <div>
              <Label htmlFor="attachments">
                Template Files (optional)
              </Label>
              <Input
                id="attachments"
                name="attachments"
                type="file"
                multiple
                className="cursor-pointer"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Attach reference files for employees
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Employee Assignment */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Assign To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                type="button"
                variant={assignMode === "select" ? "default" : "outline"}
                onClick={() => setAssignMode("select")}
                size="sm"
              >
                Select Employees
              </Button>
              <Button
                type="button"
                variant={assignMode === "department" ? "default" : "outline"}
                onClick={() => setAssignMode("department")}
                size="sm"
              >
                By Department
              </Button>
              <Button
                type="button"
                variant={assignMode === "all" ? "default" : "outline"}
                onClick={() => setAssignMode("all")}
                size="sm"
              >
                All Employees
              </Button>
            </div>

            {assignMode === "select" && (
              <EmployeeSelector
                selectedIds={selectedEmployees}
                onChange={setSelectedEmployees}
              />
            )}

            {assignMode === "department" && (
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Enter department name"
                />
              </div>
            )}

            {assignMode === "all" && (
              <p className="text-sm text-muted-foreground">
                This request will be assigned to all active employees.
              </p>
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
