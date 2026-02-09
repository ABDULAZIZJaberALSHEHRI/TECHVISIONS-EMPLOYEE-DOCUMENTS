"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, Shield } from "lucide-react";

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
        <div className="animate-spin h-8 w-8 border-4 border-[#1B4F72] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1B4F72] to-[#2E86C1] p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1B4F72] text-white">
            <FileText className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#1B4F72]">DRMS</h1>
          <p className="text-sm text-muted-foreground">
            Document Request Management System
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <p className="text-center text-sm text-muted-foreground">
            Sign in with your company Microsoft account to access the system.
          </p>
          <Button
            className="w-full bg-[#1B4F72] hover:bg-[#154360] h-12 text-base"
            onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}
          >
            <Shield className="mr-2 h-5 w-5" />
            Sign in with Microsoft
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Access is restricted to authorized company members only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
