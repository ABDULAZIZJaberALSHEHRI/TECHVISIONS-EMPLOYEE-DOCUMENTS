"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "./NotificationBell";
import { getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Menu, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Topbar() {
  const { data: session } = useSession();
  const user = session?.user;
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-4">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 rounded-full"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Moon className="h-5 w-5 text-slate-600" />
            )}
          </Button>
        )}
        <NotificationBell />
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 ring-2 ring-gray-100 dark:ring-slate-700 transition-transform duration-200 hover:scale-110">
            <AvatarImage src={user?.image || undefined} />
            <AvatarFallback className="bg-blue-500 text-white text-xs font-medium">
              {user?.name ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
              {user?.role}
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
