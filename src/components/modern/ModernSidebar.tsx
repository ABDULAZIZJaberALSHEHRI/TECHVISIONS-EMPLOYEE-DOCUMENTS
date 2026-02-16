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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

export function ModernSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role;
  const [incomingCount, setIncomingCount] = useState(0);

  // Fetch pending assigned count for HR badge (PRESERVED LOGIC)
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

  // PRESERVED LOGIC: Role-based navigation
  if (role === "ADMIN" || role === "HR") {
    navItems.push(
      {
        label: "Dashboard",
        href: "/hr/dashboard",
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
      {
        label: "My Requests",
        href: "/hr/requests",
        icon: <FileText className="h-5 w-5" />,
      }
    );

    // "Incoming Tasks" only for HR — strictly assigned requests
    if (role === "HR") {
      navItems.push({
        label: "Incoming Tasks",
        href: "/hr/assignments",
        icon: <Inbox className="h-5 w-5" />,
        badge: incomingCount,
      });
    }

    navItems.push(
      {
        label: "Employees",
        href: "/hr/employees",
        icon: <Users className="h-5 w-5" />,
      },
      {
        label: "Tracking Matrix",
        href: "/hr/tracking",
        icon: <Grid3X3 className="h-5 w-5" />,
      }
    );
  }

  if (role === "DEPARTMENT_HEAD") {
    navItems.push(
      {
        label: "Dashboard",
        href: "/dept-head/dashboard",
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
      {
        label: "Requests",
        href: "/dept-head/requests",
        icon: <FileText className="h-5 w-5" />,
      },
      {
        label: "Tracking Matrix",
        href: "/dept-head/tracking",
        icon: <Grid3X3 className="h-5 w-5" />,
      }
    );
  }

  if (role === "EMPLOYEE") {
    navItems.push(
      {
        label: "Dashboard",
        href: "/employee/dashboard",
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
      {
        label: "My Requests",
        href: "/employee/documents",
        icon: <ClipboardList className="h-5 w-5" />,
      }
    );
  }

  if (role === "ADMIN") {
    navItems.push(
      {
        label: "User Management",
        href: "/admin/users",
        icon: <Shield className="h-5 w-5" />,
      },
      {
        label: "Categories",
        href: "/admin/categories",
        icon: <FolderOpen className="h-5 w-5" />,
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: <Settings className="h-5 w-5" />,
      },
      {
        label: "Audit Logs",
        href: "/admin/audit-logs",
        icon: <Upload className="h-5 w-5" />,
      }
    );
  }

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[280px] flex-col border-r border-slate-800/50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 lg:flex">
      {/* Modern Logo Area with Gradient */}
      <div className="relative flex h-16 items-center gap-3 border-b border-slate-700/50 px-6 bg-gradient-to-r from-slate-800/50 to-transparent">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold text-lg shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-110 hover:shadow-blue-500/50">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">DRMS</h1>
          <p className="text-xs text-slate-400">Document Management</p>
        </div>
      </div>

      {/* Navigation with Enhanced Styling */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {navItems.map((item, index) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-300",
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Active Indicator Glow */}
              {isActive && (
                <div className="absolute -left-1 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-cyan-400 to-blue-500" />
              )}

              <span
                className={cn(
                  "transition-all duration-300",
                  isActive && "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]",
                  !isActive && "group-hover:scale-110 group-hover:text-blue-400"
                )}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold transition-all duration-300",
                    isActive
                      ? "bg-white/20 text-white ring-2 ring-white/30"
                      : "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 animate-pulse"
                  )}
                >
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Modern Sign Out Button */}
      <div className="border-t border-slate-700/50 p-4 bg-gradient-to-t from-slate-900/50 to-transparent">
        <Separator className="mb-4 bg-slate-700/50" />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition-all duration-300 hover:bg-red-900/30 hover:text-red-400 hover:shadow-lg hover:shadow-red-900/20"
        >
          <LogOut className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1 group-hover:text-red-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
