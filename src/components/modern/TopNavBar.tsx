"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
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
  Sun,
  Moon,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useBranding } from "@/hooks/use-branding";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

// Dropdown component for grouped nav items
function NavDropdown({
  group,
  pathname,
  openDropdown,
  setOpenDropdown,
}: {
  group: NavGroup;
  pathname: string;
  openDropdown: string | null;
  setOpenDropdown: (id: string | null) => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isOpen = openDropdown === group.label;

  const hasActiveChild = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  const totalBadge = group.items.reduce((sum, item) => sum + (item.badge && item.badge > 0 ? item.badge : 0), 0);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, setOpenDropdown]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpenDropdown(isOpen ? null : group.label)}
        className={cn(
          "relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
          hasActiveChild
            ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20"
            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
        )}
      >
        {group.icon}
        <span>{group.label}</span>
        {totalBadge > 0 && (
          <span
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
              hasActiveChild
                ? "bg-white/25 text-white"
                : "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm animate-pulse"
            )}
          >
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown panel */}
      <div
        className={cn(
          "absolute left-0 top-full mt-1 min-w-[200px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 py-1.5 transition-all duration-200 origin-top z-50",
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        {group.items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpenDropdown(null)}
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition-all duration-150 mx-1.5 rounded-lg",
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm"
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
      </div>
    </div>
  );
}

export function TopNavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role;
  const [incomingCount, setIncomingCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { appName, appSubtitle, logoUrl } = useBranding();

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
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [role]);

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
  }, [pathname]);

  // Build grouped navigation based on role
  const navEntries: NavEntry[] = [];

  // All flat items for mobile (preserved)
  const allFlatItems: NavItem[] = [];

  if (role === "ADMIN" || role === "HR") {
    // Dashboard - standalone link
    navEntries.push({
      label: "Dashboard",
      href: "/hr/dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    });
    allFlatItems.push({
      label: "Dashboard",
      href: "/hr/dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    });

    // Requests dropdown
    const requestsItems: NavItem[] = [
      {
        label: "My Requests",
        href: "/hr/requests",
        icon: <FileText className="h-4 w-4" />,
      },
    ];

    if (role === "HR") {
      requestsItems.push({
        label: "Incoming Tasks",
        href: "/hr/assignments",
        icon: <Inbox className="h-4 w-4" />,
        badge: incomingCount,
      });
    }

    requestsItems.push({
      label: "Tracking Matrix",
      href: "/hr/tracking",
      icon: <Grid3X3 className="h-4 w-4" />,
    });

    if (role === "ADMIN") {
      requestsItems.push({
        label: "Categories",
        href: "/admin/categories",
        icon: <FolderOpen className="h-4 w-4" />,
      });
    }

    navEntries.push({
      label: "Requests",
      icon: <FileText className="h-4 w-4" />,
      items: requestsItems,
    });
    allFlatItems.push(...requestsItems);

    // Users dropdown
    const usersItems: NavItem[] = [];

    if (role === "ADMIN") {
      usersItems.push({
        label: "User Management",
        href: "/admin/users",
        icon: <Shield className="h-4 w-4" />,
      });
    }

    usersItems.push({
      label: "Employees",
      href: "/hr/employees",
      icon: <Users className="h-4 w-4" />,
    });

    navEntries.push({
      label: "Users",
      icon: <Users className="h-4 w-4" />,
      items: usersItems,
    });
    allFlatItems.push(...usersItems);

    // System dropdown (ADMIN only)
    if (role === "ADMIN") {
      const systemItems: NavItem[] = [
        {
          label: "Settings",
          href: "/admin/settings",
          icon: <Settings className="h-4 w-4" />,
        },
        {
          label: "Audit Logs",
          href: "/admin/audit-logs",
          icon: <Upload className="h-4 w-4" />,
        },
      ];

      navEntries.push({
        label: "System",
        icon: <Settings className="h-4 w-4" />,
        items: systemItems,
      });
      allFlatItems.push(...systemItems);
    }
  }

  if (role === "DEPARTMENT_HEAD") {
    navEntries.push({
      label: "Dashboard",
      href: "/dept-head/dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    });
    allFlatItems.push({
      label: "Dashboard",
      href: "/dept-head/dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    });

    const requestsItems: NavItem[] = [
      {
        label: "Requests",
        href: "/dept-head/requests",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        label: "Tracking Matrix",
        href: "/dept-head/tracking",
        icon: <Grid3X3 className="h-4 w-4" />,
      },
    ];

    navEntries.push({
      label: "Requests",
      icon: <FileText className="h-4 w-4" />,
      items: requestsItems,
    });
    allFlatItems.push(...requestsItems);
  }

  if (role === "EMPLOYEE") {
    navEntries.push({
      label: "Dashboard",
      href: "/employee/dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    });
    navEntries.push({
      label: "Requests",
      href: "/employee/documents",
      icon: <ClipboardList className="h-4 w-4" />,
    });
    allFlatItems.push(
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

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/30 transition-all duration-300 hover:scale-110 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-5 w-5 object-contain" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </div>
          <div className="hidden md:block">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{appName}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{appSubtitle}</p>
          </div>
        </div>

        {/* Desktop Navigation - Grouped Dropdowns */}
        <div className="hidden lg:flex items-center gap-1">
          {navEntries.map((entry) => {
            if (isGroup(entry)) {
              return (
                <NavDropdown
                  key={entry.label}
                  group={entry}
                  pathname={pathname}
                  openDropdown={openDropdown}
                  setOpenDropdown={setOpenDropdown}
                />
              );
            }

            // Standalone link (Dashboard)
            const isActive =
              pathname === entry.href || pathname.startsWith(entry.href + "/");
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {entry.icon}
                <span>{entry.label}</span>
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white overflow-hidden">
                      {logoUrl ? (
                        <img src={logoUrl} alt={appName} className="h-5 w-5 object-contain" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">{appName}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Menu</p>
                    </div>
                  </div>
                </div>

                {/* Mobile Navigation - grouped with section headers */}
                <nav className="flex-1 overflow-y-auto p-4">
                  {navEntries.map((entry) => {
                    if (isGroup(entry)) {
                      return (
                        <div key={entry.label} className="mb-3">
                          <p className="px-3 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {entry.label}
                          </p>
                          <div className="space-y-1">
                            {entry.items.map((item) => {
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
                          </div>
                        </div>
                      );
                    }

                    // Standalone link
                    const isActive =
                      pathname === entry.href ||
                      pathname.startsWith(entry.href + "/");
                    return (
                      <div key={entry.href} className="mb-1">
                        <Link
                          href={entry.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all",
                            isActive
                              ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          {entry.icon}
                          <span className="flex-1">{entry.label}</span>
                        </Link>
                      </div>
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
