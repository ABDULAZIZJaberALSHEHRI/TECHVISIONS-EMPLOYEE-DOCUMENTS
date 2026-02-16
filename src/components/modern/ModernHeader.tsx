"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ModernSidebar } from "./ModernSidebar";

export function ModernHeader() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-4 lg:px-6 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Mobile menu (PRESERVED LOGIC) */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <ModernSidebar />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-4">
        {/* NotificationBell (PRESERVED COMPONENT) */}
        <NotificationBell />

        {/* Enhanced User Avatar Section */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-9 w-9 ring-2 ring-blue-100 dark:ring-blue-900 transition-all duration-300 hover:scale-110 hover:ring-blue-300 dark:hover:ring-blue-700 hover:shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50">
              <AvatarImage src={user?.image || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs font-bold">
                {user?.name ? getInitials(user.name) : "?"}
              </AvatarFallback>
            </Avatar>
            {/* Online Status Indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-sm" />
          </div>

          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {user?.name}
            </p>
            <Badge
              variant="secondary"
              className="text-[10px] px-2 py-0.5 font-medium bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50"
            >
              {user?.role}
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
