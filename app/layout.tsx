import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "LPL mult - Gestão de Brindes",
  description: "Sistema premium de gestão de brindes, estoque e vendas vinculadas a campanhas promocionais",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-gray-50 dark:bg-[#0a0a1e] text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "var(--toast-bg, #fff)",
                color: "var(--toast-color, #111)",
                border: "1px solid rgba(43,43,255,0.2)",
                borderRadius: "12px",
                fontFamily: "Inter, sans-serif",
                fontSize: "14px",
                boxShadow: "0 4px 24px rgba(43,43,255,0.15)",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
