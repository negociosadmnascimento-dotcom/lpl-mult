"use client";

import { useState } from "react";
import { Bell, Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { NotificationPanel } from "./NotificationPanel";
import { useSidebar } from "@/app/(dashboard)/layout";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <>
      {/* Always dark header bar */}
      <header className="sticky top-0 z-30 bg-[#0d0d2e]/95 backdrop-blur-xl border-b border-white/5 px-4 md:px-6 py-3.5">
        <div className="flex items-center gap-4">
          {/* Mobile menu */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all duration-200"
              title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className={cn(
                "relative p-2.5 rounded-xl transition-all duration-200",
                notifOpen
                  ? "bg-brand-blue/20 text-brand-blue"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-brand-red text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse-ring">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Notification Panel */}
      {notifOpen && (
        <NotificationPanel onClose={() => setNotifOpen(false)} />
      )}
    </>
  );
}
