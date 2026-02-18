"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, Upload, X } from "lucide-react";
import { PageContainer, PageHeader, FormContainer } from "@/components/modern";
import { invalidateBrandingCache } from "@/hooks/use-branding";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLoginImage, setUploadingLoginImage] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const loginImageInputRef = useRef<HTMLInputElement>(null);
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
        invalidateBrandingCache();
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

  const handleImageUpload = async (file: File, type: "logo" | "login_image") => {
    const setUploading = type === "logo" ? setUploadingLogo : setUploadingLoginImage;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/upload/branding", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        const settingKey = type === "logo" ? "logo_url" : "login_side_image";
        setSettings((prev) => ({ ...prev, [settingKey]: data.url }));
        invalidateBrandingCache();
        toast({ title: `${type === "logo" ? "Logo" : "Login image"} uploaded successfully` });
      } else {
        toast({
          title: "Upload Error",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const clearImage = (type: "logo" | "login_image") => {
    const settingKey = type === "logo" ? "logo_url" : "login_side_image";
    updateSetting(settingKey, "");
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="System Settings"
        description="Configure system-wide settings and preferences"
        actions={
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        }
      />

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

        {/* Branding Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* App Name */}
              <div>
                <Label>App Name</Label>
                <Input
                  value={settings.app_name || ""}
                  onChange={(e) => updateSetting("app_name", e.target.value)}
                  placeholder="DRMS"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Displayed in sidebar, navbar, and login page
                </p>
              </div>

              {/* App Subtitle */}
              <div>
                <Label>App Subtitle</Label>
                <Input
                  value={settings.app_subtitle || ""}
                  onChange={(e) => updateSetting("app_subtitle", e.target.value)}
                  placeholder="Document Management"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Subtitle shown below the app name
                </p>
              </div>

              {/* Primary Color */}
              <div>
                <Label>Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.primary_color || "#2563EB"}
                    onChange={(e) => updateSetting("primary_color", e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background p-1"
                  />
                  <Input
                    value={settings.primary_color || "#2563EB"}
                    onChange={(e) => updateSetting("primary_color", e.target.value)}
                    placeholder="#2563EB"
                    className="flex-1"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Primary brand color used on login page buttons and accents
                </p>
              </div>
            </div>

            {/* Logo Upload */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label>Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  {settings.logo_url ? (
                    <div className="relative">
                      <img
                        src={settings.logo_url}
                        alt="Logo preview"
                        className="h-16 w-16 rounded-xl object-contain border border-input bg-background p-1"
                      />
                      <button
                        onClick={() => clearImage("logo")}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-input bg-muted/50 text-muted-foreground">
                      <Upload className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "logo");
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Upload Logo
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PNG, JPG, SVG, or WebP. Max 5MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Login Side Image Upload */}
              <div>
                <Label>Login Page Side Image</Label>
                <div className="mt-2 flex items-center gap-4">
                  {settings.login_side_image ? (
                    <div className="relative">
                      <img
                        src={settings.login_side_image}
                        alt="Login image preview"
                        className="h-16 w-24 rounded-xl object-cover border border-input bg-background p-1"
                      />
                      <button
                        onClick={() => clearImage("login_image")}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-16 w-24 items-center justify-center rounded-xl border-2 border-dashed border-input bg-muted/50 text-muted-foreground">
                      <Upload className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <input
                      ref={loginImageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "login_image");
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingLoginImage}
                      onClick={() => loginImageInputRef.current?.click()}
                    >
                      {uploadingLoginImage ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Upload Image
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Shown on the left side of the login page. PNG, JPG, SVG, or WebP. Max 5MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
