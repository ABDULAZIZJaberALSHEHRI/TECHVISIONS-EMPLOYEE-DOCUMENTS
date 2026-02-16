"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, Shield, UserCog, Users, User } from "lucide-react";

const isDev = process.env.NODE_ENV === "development";

const devAccounts = [
  { email: "admin@test.com", label: "Admin", icon: UserCog, color: "bg-red-500 hover:bg-red-600" },
  { email: "hr@test.com", label: "HR Manager", icon: Users, color: "bg-amber-500 hover:bg-amber-600" },
  { email: "employee@test.com", label: "Employee", icon: User, color: "bg-emerald-500 hover:bg-emerald-600" },
];

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md shadow-2xl border-0 animate-scale-in">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/30 animate-fade-in-down animate-fill-both">
            <FileText className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 animate-fade-in animate-fill-both" style={{ animationDelay: "100ms" }}>
            DRMS
          </h1>
          <p className="text-sm text-gray-500 animate-fade-in animate-fill-both" style={{ animationDelay: "200ms" }}>
            Document Request Management System
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <p className="text-center text-sm text-gray-500 animate-fade-in animate-fill-both" style={{ animationDelay: "250ms" }}>
            Sign in with your company Microsoft account to access the system.
          </p>
          <div className="animate-fade-in-up animate-fill-both" style={{ animationDelay: "300ms" }}>
            <Button
              className="w-full bg-blue-500 hover:bg-blue-600 h-12 text-base shadow-md hover:shadow-lg"
              onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}
            >
              <Shield className="mr-2 h-5 w-5" />
              Sign in with Microsoft
            </Button>
          </div>

          {isDev && (
            <div className="border-t pt-4 space-y-3 animate-fade-in-up animate-fill-both" style={{ animationDelay: "400ms" }}>
              <p className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
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

          <p className="text-center text-xs text-gray-400 animate-fade-in animate-fill-both" style={{ animationDelay: "600ms" }}>
            Access is restricted to authorized company members only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
