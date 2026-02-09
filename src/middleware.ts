import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // HR routes (accessible by HR and ADMIN)
    if (
      path.startsWith("/hr") &&
      token?.role !== "HR" &&
      token?.role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Employee routes (accessible by EMPLOYEE only — HR/Admin have their own views)
    if (path.startsWith("/employee") && token?.role === undefined) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/hr/:path*",
    "/employee/:path*",
    "/admin/:path*",
    "/api/requests/:path*",
    "/api/assignments/:path*",
    "/api/documents/:path*",
    "/api/users/:path*",
    "/api/categories/:path*",
    "/api/notifications/:path*",
    "/api/audit-logs/:path*",
    "/api/settings/:path*",
    "/api/dashboard/:path*",
  ],
};
