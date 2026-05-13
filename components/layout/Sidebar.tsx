"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    group: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "Estoque",
    items: [
      { href: "/estoque/entrada", label: "Entrada de Brindes", icon: PackagePlus },
      { href: "/estoque", label: "Estoque", icon: Boxes },
    ],
  },
  {
    group: "Comercial",
    items: [
      { href: "/pedidos", label: "Pedidos", icon: ShoppingCart },
      { href: "/pedidos/novo", label: "Novo Pedido", icon: Package },
    ],
  },
  {
    group: "Relatórios",
    items: [
      { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
    ],
  },
  {
    group: "Sistema",
    items: [
      { href: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("lpl-auth");
    router.push("/");
  }

  return (
    /* Always dark — ignores theme */
    <aside className="flex flex-col h-full bg-[#0d0d2e] border-r border-white/5">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center border-2 border-brand-red shadow-md shadow-brand-blue/30 flex-shrink-0">
            <div className="text-center">
              <div className="text-white font-black text-xs leading-none">LPL</div>
              <div className="text-white/80 font-medium text-[7px]">mult</div>
            </div>
          </div>
          <div>
            <h2 className="font-bold text-white text-sm leading-none">LPL mult</h2>
            <p className="text-gray-400 text-xs mt-0.5">Gestão de Brindes</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navItems.map((group) => (
          <div key={group.group}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 px-3 mb-2">
              {group.group}
            </p>
            <ul className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                        isActive
                          ? "bg-brand-blue/20 border-l-2 border-brand-blue text-brand-blue-light pl-[10px]"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Icon
                        size={18}
                        className={cn(
                          "flex-shrink-0 transition-colors",
                          isActive ? "text-brand-blue" : "text-gray-500 group-hover:text-gray-300"
                        )}
                      />
                      <span className="flex-1">{label}</span>
                      {isActive && (
                        <ChevronRight size={14} className="text-brand-blue opacity-60" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-900/20 hover:text-red-400 transition-all duration-200 group"
        >
          <LogOut size={18} className="flex-shrink-0 group-hover:text-red-400 transition-colors" />
          <span>Sair do Sistema</span>
        </button>
        <div className="mt-3 px-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-600">Modo compartilhado ativo</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
