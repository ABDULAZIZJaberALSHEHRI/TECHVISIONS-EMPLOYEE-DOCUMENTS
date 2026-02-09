"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSettings(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Settings saved successfully" });
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
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B4F72]">System Settings</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input
                value={settings.company_name || ""}
                onChange={(e) => updateSetting("company_name", e.target.value)}
                placeholder="Your Company"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">File Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Max File Size (MB)</Label>
              <Input
                type="number"
                value={settings.max_file_size_mb || "10"}
                onChange={(e) =>
                  updateSetting("max_file_size_mb", e.target.value)
                }
                min={1}
                max={100}
              />
            </div>
            <div>
              <Label>Accepted Formats</Label>
              <Input
                value={settings.accepted_formats || ""}
                onChange={(e) =>
                  updateSetting("accepted_formats", e.target.value)
                }
                placeholder="pdf,jpg,jpeg,png,doc,docx"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Comma-separated list of file extensions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reminders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Reminder Days Before Deadline</Label>
              <Input
                value={settings.reminder_days_before || "3,1"}
                onChange={(e) =>
                  updateSetting("reminder_days_before", e.target.value)
                }
                placeholder="3,1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Comma-separated days (e.g., &quot;3,1&quot; means 3 days and 1
                day before deadline)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
