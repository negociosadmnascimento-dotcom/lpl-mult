"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

export const SidebarContext = createContext<{
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}>({ sidebarOpen: false, toggleSidebar: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("lpl-auth");
    if (!auth) {
      router.push("/");
    }
  }, [router]);

  return (
    <SidebarContext.Provider value={{ sidebarOpen, toggleSidebar: () => setSidebarOpen((v) => !v) }}>
      {/* Always dark background for the whole shell */}
      <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-[#0a0a1e]">
        {/* Desktop sidebar — always dark */}
        <div className="hidden md:flex md:flex-shrink-0 w-64">
          <div className="w-64 flex flex-col">
            <Sidebar />
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative w-64 flex flex-col shadow-2xl animate-slide-in-left">
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-[#0a0a1e]">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
