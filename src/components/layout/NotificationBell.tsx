"use client";

import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleClick = async (notificationId: string, link: string | null) => {
    await markAsRead(notificationId);
    if (link) {
      setOpen(false);
      router.push(link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <Bell className={cn(
            "h-5 w-5 transition-all duration-200 group-hover:text-blue-500",
            unreadCount > 0 && "animate-bell-shake"
          )} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-scale-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-xl border-gray-200" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-gray-50/50">
          <h4 className="text-sm font-semibold text-gray-900">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50"
              onClick={markAllAsRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
              No notifications
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition-all duration-150 hover:bg-blue-50/50",
                  !n.isRead && "bg-blue-50/30"
                )}
                onClick={() => handleClick(n.id, n.link)}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm text-gray-700",
                      !n.isRead && "font-semibold text-gray-900"
                    )}
                  >
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-400 line-clamp-2">
                    {n.message}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {!n.isRead && (
                  <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500 animate-pulse-subtle" />
                )}
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
