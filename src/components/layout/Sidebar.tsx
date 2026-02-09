"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role;

  const navItems: NavItem[] = [];

  if (role === "ADMIN" || role === "HR") {
    navItems.push(
      {
        label: "Dashboard",
        href: "/hr/dashboard",
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
      {
        label: "Requests",
        href: "/hr/requests",
        icon: <FileText className="h-5 w-5" />,
      },
      {
        label: "Employees",
        href: "/hr/employees",
        icon: <Users className="h-5 w-5" />,
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
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B4F72] text-white font-bold text-sm">
          D
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#1B4F72]">DRMS</h1>
          <p className="text-xs text-muted-foreground">Document Management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#1B4F72] text-white"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <Separator className="mb-4" />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
