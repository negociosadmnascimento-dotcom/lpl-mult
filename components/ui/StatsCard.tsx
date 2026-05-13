"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: "blue" | "green" | "red" | "purple" | "orange" | "emerald";
  trend?: {
    value: number;
    label: string;
  };
  urgent?: boolean;
}

const colorConfig = {
  blue: {
    bg: "bg-brand-blue/10 dark:bg-brand-blue/15",
    icon: "text-brand-blue",
    border: "border-brand-blue/20",
    glow: "shadow-brand-blue/10",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/20",
    icon: "text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-800/30",
    glow: "shadow-green-500/10",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-900/20",
    icon: "text-brand-red",
    border: "border-red-200 dark:border-red-800/30",
    glow: "shadow-red-500/10",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/20",
    icon: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800/30",
    glow: "shadow-purple-500/10",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-900/20",
    icon: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800/30",
    glow: "shadow-orange-500/10",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-900/20",
    icon: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800/30",
    glow: "shadow-emerald-500/10",
  },
};

export function StatsCard({ title, value, subtitle, icon: Icon, color, trend, urgent }: StatsCardProps) {
  const cfg = colorConfig[color];

  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group",
        urgent && "border-brand-red/40 ring-1 ring-brand-red/20"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl", cfg.bg)}>
          <Icon size={20} className={cfg.icon} />
        </div>
        {urgent && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-brand-red bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full animate-pulse">
            <span className="w-1.5 h-1.5 bg-brand-red rounded-full" />
            ALERTA
          </span>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
          {value}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
          {trend.value >= 0 ? (
            <TrendingUp size={13} className="text-green-500" />
          ) : (
            <TrendingDown size={13} className="text-red-500" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              trend.value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}
          >
            {trend.value >= 0 ? "+" : ""}{trend.value}%
          </span>
          <span className="text-xs text-gray-400">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
