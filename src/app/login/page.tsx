"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, Shield, UserCog, Users, User } from "lucide-react";
import { useBranding } from "@/hooks/use-branding";

const isDev = process.env.NODE_ENV === "development";

const devAccounts = [
  { email: "admin@test.com", label: "Admin", icon: UserCog, color: "bg-red-500 hover:bg-red-600" },
  { email: "hr@test.com", label: "HR Manager", icon: Users, color: "bg-amber-500 hover:bg-amber-600" },
  { email: "employee@test.com", label: "Employee", icon: User, color: "bg-emerald-500 hover:bg-emerald-600" },
];

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { appName, appSubtitle, logoUrl, loginSideImage, primaryColor, loading: brandingLoading } = useBranding();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (status === "loading" || brandingLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Full-page background image layer */}
      {loginSideImage && (
        <div className="absolute inset-0 z-0">
          <img
            src={loginSideImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover scale-110 opacity-25 blur-[2px]"
          />
          {/* Radial vignette: darkens edges, lighter center where card sits */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, transparent 0%, rgba(15,23,42,0.4) 70%, rgba(15,23,42,0.7) 100%)",
            }}
          />
          {/* Soft brand color wash */}
          <div
            className="absolute inset-0 mix-blend-soft-light"
            style={{ backgroundColor: `${primaryColor}20` }}
          />
        </div>
      )}

      {/* Decorative color orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
        <div
          className="absolute -top-40 -right-40 h-80 w-80 rounded-full blur-3xl"
          style={{ backgroundColor: `${primaryColor}15` }}
        />
        <div
          className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full blur-3xl"
          style={{ backgroundColor: `${primaryColor}15` }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full blur-3xl"
          style={{ backgroundColor: `${primaryColor}08` }}
        />
      </div>

      {/* Login Card */}
      <Card className={`relative z-10 w-full max-w-md shadow-2xl border-0 animate-scale-in ${loginSideImage ? "bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm" : ""}`}>
        <CardHeader className="text-center pb-2">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg animate-fade-in-down animate-fill-both overflow-hidden"
            style={{
              backgroundColor: primaryColor,
              boxShadow: `0 10px 15px -3px ${primaryColor}4D`,
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-10 w-10 object-contain" />
            ) : (
              <FileText className="h-8 w-8" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white animate-fade-in animate-fill-both" style={{ animationDelay: "100ms" }}>
            {appName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 animate-fade-in animate-fill-both" style={{ animationDelay: "200ms" }}>
            {appSubtitle}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <p className="text-center text-sm text-gray-500 dark:text-slate-400 animate-fade-in animate-fill-both" style={{ animationDelay: "250ms" }}>
            Sign in with your company Microsoft account to access the system.
          </p>
          <div className="animate-fade-in-up animate-fill-both" style={{ animationDelay: "300ms" }}>
            <Button
              className="w-full h-12 text-base shadow-md hover:shadow-lg text-white"
              style={{
                backgroundColor: primaryColor,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = "brightness(0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = "brightness(1)";
              }}
              onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}
            >
              <Shield className="mr-2 h-5 w-5" />
              Sign in with Microsoft
            </Button>
          </div>

          {isDev && (
            <div className="border-t pt-4 space-y-3 animate-fade-in-up animate-fill-both" style={{ animationDelay: "400ms" }}>
              <p className="text-center text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                Dev Quick Login
              </p>
              <div className="grid gap-2">
                {devAccounts.map((acc, i) => (
                  <Button
                    key={acc.email}
                    className={`w-full h-10 text-sm text-white shadow-sm hover:shadow-md ${acc.color} animate-fade-in-up animate-fill-both`}
                    style={{ animationDelay: `${450 + i * 60}ms` }}
                    onClick={() =>
                      signIn("dev-credentials", {
                        email: acc.email,
                        callbackUrl: "/dashboard",
                      })
                    }
                  >
                    <acc.icon className="mr-2 h-4 w-4" />
                    {acc.label} ({acc.email})
                  </Button>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 dark:text-slate-500 animate-fade-in animate-fill-both" style={{ animationDelay: "600ms" }}>
            Access is restricted to authorized company members only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
