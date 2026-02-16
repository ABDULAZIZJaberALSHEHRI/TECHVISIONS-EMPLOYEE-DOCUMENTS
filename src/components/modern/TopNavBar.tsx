"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Users,
  FolderOpen,
  Settings,
  Shield,
  Upload,
  ClipboardList,
  LogOut,
  Grid3X3,
  Inbox,
  Sparkles,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

export function TopNavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role;
  const [incomingCount, setIncomingCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // PRESERVED LOGIC: Fetch pending assigned count for HR badge
  useEffect(() => {
    if (role !== "HR") return;

    const fetchCount = () => {
      fetch("/api/hr/assignments?countOnly=true")
        .then((res) => res.json())
        .then((res) => {
          if (res.success) setIncomingCount(res.pendingCount || 0);
        })
        .catch(() => {});
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [role]);

  const navItems: NavItem[] = [];

  // PRESERVED LOGIC: Role-based navigation (EXACT COPY FROM SIDEBAR)
  if (role === "ADMIN" || role === "HR") {
    navItems.push(
      {
        label: "Dashboard",
        href: "/hr/dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        label: "My Requests",
        href: "/hr/requests",
        icon: <FileText className="h-4 w-4" />,
      }
    );

    // "Incoming Tasks" only for HR — strictly assigned requests
    if (role === "HR") {
      navItems.push({
        label: "Incoming Tasks",
        href: "/hr/assignments",
        icon: <Inbox className="h-4 w-4" />,
        badge: incomingCount,
      });
    }

    navItems.push(
      {
        label: "Employees",
        href: "/hr/employees",
        icon: <Users className="h-4 w-4" />,
      },
      {
        label: "Tracking Matrix",
        href: "/hr/tracking",
        icon: <Grid3X3 className="h-4 w-4" />,
      }
    );
  }

  if (role === "DEPARTMENT_HEAD") {
    navItems.push(
      {
        label: "Dashboard",
        href: "/dept-head/dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        label: "Requests",
        href: "/dept-head/requests",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        label: "Tracking Matrix",
        href: "/dept-head/tracking",
        icon: <Grid3X3 className="h-4 w-4" />,
      }
    );
  }

  if (role === "EMPLOYEE") {
    navItems.push(
      {
        label: "Dashboard",
        href: "/employee/dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        label: "Requests",
        href: "/employee/documents",
        icon: <ClipboardList className="h-4 w-4" />,
      }
    );
  }

  if (role === "ADMIN") {
    navItems.push(
      {
        label: "User Management",
        href: "/admin/users",
        icon: <Shield className="h-4 w-4" />,
      },
      {
        label: "Categories",
        href: "/admin/categories",
        icon: <FolderOpen className="h-4 w-4" />,
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: <Settings className="h-4 w-4" />,
      },
      {
        label: "Audit Logs",
        href: "/admin/audit-logs",
        icon: <Upload className="h-4 w-4" />,
      }
    );
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/30 transition-all duration-300 hover:scale-110">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="hidden md:block">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">DRMS</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Document Management</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            // PRESERVED LOGIC: Active state detection (EXACT COPY)
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm animate-pulse"
                    )}
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          )}

          {/* Sign Out Button - Desktop */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="hidden lg:flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <div className="flex h-full flex-col">
                {/* Mobile Header */}
                <div className="flex h-16 items-center justify-between border-b px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">DRMS</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Menu</p>
                    </div>
                  </div>
                </div>

                {/* Mobile Navigation */}
                <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                  {navItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all",
                          isActive
                            ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={cn(
                              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                              isActive
                                ? "bg-white/25 text-white"
                                : "bg-gradient-to-r from-red-500 to-rose-600 text-white"
                            )}
                          >
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>

                {/* Mobile Sign Out */}
                <div className="border-t p-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="w-full justify-start gap-3 text-slate-700 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
