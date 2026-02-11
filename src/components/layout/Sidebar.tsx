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

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role;
  const [incomingCount, setIncomingCount] = useState(0);

  // Fetch pending assigned count for HR badge
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
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[280px] flex-col border-r bg-white lg:flex">
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white font-bold text-sm shadow-sm shadow-blue-500/30 transition-transform duration-300 hover:scale-110">
          D
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">DRMS</h1>
          <p className="text-xs text-gray-400">Document Management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item, index) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-blue-500 text-white shadow-sm shadow-blue-500/25"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className={cn(
                "transition-transform duration-200",
                !isActive && "group-hover:scale-110"
              )}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-red-500 text-white animate-pulse"
                )}>
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <Separator className="mb-4" />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
