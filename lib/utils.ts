import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "-";
  }
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "-";
  }
}

export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getStockStatus(atual: number, minimo: number): "ok" | "low" | "critical" {
  if (atual <= 0) return "critical";
  if (atual <= minimo) return "low";
  return "ok";
}

export function getNotificationIcon(tipo: string): string {
  const icons: Record<string, string> = {
    entrada_pedido: "📦",
    brinde_reservado: "🎁",
    saida_brinde: "📤",
    estoque_baixo: "⚠️",
    nova_entrada: "📥",
  };
  return icons[tipo] || "🔔";
}

export function timeAgo(date: string): string {
  const now = new Date();
  const past = parseISO(date);
  const diff = now.getTime() - past.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `há ${days} dia${days > 1 ? "s" : ""}`;
  if (hours > 0) return `há ${hours} hora${hours > 1 ? "s" : ""}`;
  if (minutes > 0) return `há ${minutes} minuto${minutes > 1 ? "s" : ""}`;
  return "agora mesmo";
}
