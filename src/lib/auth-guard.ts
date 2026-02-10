import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import type { Role } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
  managedDepartment: string | null;
}

export async function getAuthUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    department: session.user.department,
    managedDepartment: session.user.managedDepartment,
  };
}

export async function requireAuth(): Promise<
  AuthenticatedUser | NextResponse
> {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }
  return user;
}

export async function requireRole(
  roles: Role[]
): Promise<AuthenticatedUser | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;

  if (!roles.includes(result.role)) {
    return NextResponse.json(
      { success: false, error: "Insufficient permissions" },
      { status: 403 }
    );
  }
  return result;
}

export function isNextResponse(
  value: AuthenticatedUser | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}

// Rate limiting helper
const rateLimitMap = new Map<
  string,
  { count: number; lastReset: number }
>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now - record.lastReset > windowMs) {
    rateLimitMap.set(key, { count: 1, lastReset: now });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: "Too many requests. Please try again later." },
    { status: 429 }
  );
}
