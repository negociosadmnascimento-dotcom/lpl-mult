"use client";

import { timeAgo } from "@/lib/utils";
import { Bell, CheckCheck, X, AlertTriangle, Package, PackagePlus, ShoppingCart, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notificacao } from "@/lib/types";

interface NotificationPanelProps {
  onClose: () => void;
  notifications: Notificacao[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

function getNotifColor(tipo: string) {
  const colors: Record<string, string> = {
    entrada_pedido: "text-brand-blue bg-brand-blue/10",
    brinde_reservado: "text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400",
    saida_brinde: "text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400",
    estoque_baixo: "text-brand-red bg-red-100 dark:bg-red-900/20 dark:text-red-400",
    nova_entrada: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400",
  };
  return colors[tipo] || "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400";
}

function getNotifIcon(tipo: string) {
  const icons: Record<string, React.ReactNode> = {
    entrada_pedido: <ShoppingCart size={14} />,
    brinde_reservado: <Package size={14} />,
    saida_brinde: <TrendingDown size={14} />,
    estoque_baixo: <AlertTriangle size={14} />,
    nova_entrada: <PackagePlus size={14} />,
  };
  return icons[tipo] || <Bell size={14} />;
}

export function NotificationPanel({ onClose, notifications, unreadCount, markAsRead, markAllAsRead }: NotificationPanelProps) {

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-16 right-4 z-50 w-96 max-h-[80vh] bg-white dark:bg-[#0d0d2e] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-brand-blue" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Notificações</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-brand-red text-white rounded-full px-2 py-0.5 font-medium">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-brand-blue hover:text-brand-blue-dark transition-colors font-medium"
              >
                <CheckCheck size={14} />
                Marcar todas
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="overflow-y-auto max-h-[60vh]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Bell size={32} className="mb-3 opacity-30" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-white/5">
              {notifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notif={notif}
                  onRead={markAsRead}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function NotificationItem({
  notif,
  onRead,
}: {
  notif: Notificacao;
  onRead: (id: string) => void;
}) {
  return (
    <li
      className={cn(
        "px-5 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/3 transition-colors",
        !notif.lida && "bg-brand-blue/3 dark:bg-brand-blue/5"
      )}
      onClick={() => !notif.lida && onRead(notif.id)}
    >
      <div className="flex gap-3">
        <div className={cn("mt-0.5 p-1.5 rounded-lg flex-shrink-0", getNotifColor(notif.tipo))}>
          {getNotifIcon(notif.tipo)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              "text-sm font-medium truncate",
              !notif.lida ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"
            )}>
              {notif.titulo}
            </p>
            {!notif.lida && (
              <div className="w-2 h-2 bg-brand-blue rounded-full flex-shrink-0 mt-1.5" />
            )}
          </div>
          {notif.mensagem && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
              {notif.mensagem}
            </p>
          )}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            {timeAgo(notif.created_at)}
          </p>
        </div>
      </div>
    </li>
  );
}
