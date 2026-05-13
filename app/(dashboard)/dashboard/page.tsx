"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  TrendingDown,
  ShoppingCart,
  AlertTriangle,
  Boxes,
  Activity,
  Clock,
  ArrowRight,
  Plus,
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { StatsCard } from "@/components/ui/StatsCard";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { formatDate, timeAgo, cn } from "@/lib/utils";
import type { Brinde, Pedido, Movimentacao } from "@/lib/types";

const COLORS = ["#2B2BFF", "#E53E3E", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4"];

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalEstoque: 0,
    totalDistribuidos: 0,
    totalPedidos: 0,
    brindesReservados: 0,
    alertasBaixo: 0,
  });
  const [brindes, setBrindes] = useState<Brinde[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [chartData, setChartData] = useState<Array<{ mes: string; entradas: number; saidas: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem("lpl-auth");
    if (!auth) router.push("/");
    loadData();

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "brindes" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedido_brindes" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "entradas_estoque" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "movimentacoes" }, loadData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  async function loadData() {
    setLoading(true);
    try {
      const [brindRes, pedRes, movRes, pedCountRes] = await Promise.all([
        supabase.from("brindes").select("*").eq("ativo", true).order("nome"),
        supabase.from("pedidos").select("*, pedido_brindes(*)").order("created_at", { ascending: false }).limit(10),
        supabase.from("movimentacoes").select("*, brinde:brindes(nome)").order("created_at", { ascending: false }).limit(20),
        supabase.from("pedidos").select("*", { count: "exact", head: true }),
      ]);

      const b = brindRes.data || [];
      const p = pedRes.data || [];
      const m = movRes.data || [];
      const totalPedidosCount = pedCountRes.count ?? 0;

      setBrindes(b);
      setPedidos(p);
      setMovimentacoes(m);

      const totalEstoque = b.reduce((sum: number, x: Brinde) => sum + x.estoque_atual, 0);
      const brindesReservados = b.reduce((sum: number, x: Brinde) => sum + x.estoque_reservado, 0);
      const alertasBaixo = b.filter((x: Brinde) => x.estoque_atual <= x.estoque_minimo).length;

      const { data: distribData } = await supabase
        .from("movimentacoes")
        .select("quantidade")
        .eq("tipo", "saida");
      const totalDistribuidos = (distribData || []).reduce((s: number, r: { quantidade: number }) => s + r.quantidade, 0);

      setStats({
        totalEstoque,
        totalDistribuidos,
        totalPedidos: totalPedidosCount,
        brindesReservados,
        alertasBaixo,
      });

      // Build chart data from movimentacoes
      const monthMap: Record<string, { entradas: number; saidas: number }> = {};
      m.forEach((mov: Movimentacao) => {
        const d = new Date(mov.created_at);
        const key = `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
        if (!monthMap[key]) monthMap[key] = { entradas: 0, saidas: 0 };
        if (mov.tipo === "entrada") monthMap[key].entradas += mov.quantidade;
        if (mov.tipo === "saida") monthMap[key].saidas += mov.quantidade;
      });
      setChartData(
        Object.entries(monthMap)
          .slice(-6)
          .map(([mes, v]) => ({ mes, ...v }))
      );
    } finally {
      setLoading(false);
    }
  }

  const lowStockBrindes = brindes.filter((b) => b.estoque_atual <= b.estoque_minimo);
  const topBrindes = [...brindes].sort((a, b) => b.estoque_reservado - a.estoque_reservado).slice(0, 5);
  const pieData = topBrindes.map((b, i) => ({ name: b.nome, value: b.estoque_reservado || 1 }));

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard"
        subtitle="Visão geral do sistema de brindes"
      />

      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
          <StatsCard
            title="Total em Estoque"
            value={loading ? "..." : stats.totalEstoque.toLocaleString()}
            subtitle="unidades disponíveis"
            icon={Boxes}
            color="blue"
          />
          <StatsCard
            title="Distribuídos"
            value={loading ? "..." : stats.totalDistribuidos.toLocaleString()}
            subtitle="total entregue"
            icon={TrendingDown}
            color="green"
          />
          <StatsCard
            title="Reservados"
            value={loading ? "..." : stats.brindesReservados.toLocaleString()}
            subtitle="aguardando entrega"
            icon={Package}
            color="purple"
          />
          <StatsCard
            title="Pedidos"
            value={loading ? "..." : stats.totalPedidos.toLocaleString()}
            subtitle="registrados"
            icon={ShoppingCart}
            color="orange"
          />
          <StatsCard
            title="Alertas"
            value={loading ? "..." : stats.alertasBaixo}
            subtitle="estoque baixo"
            icon={AlertTriangle}
            color="red"
            urgent={stats.alertasBaixo > 0}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area chart */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Movimentação de Estoque</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Entradas x Saídas</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-brand-blue" />
                  <span className="text-gray-500">Entradas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-brand-red" />
                  <span className="text-gray-500">Saídas</span>
                </div>
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2B2BFF" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2B2BFF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E53E3E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#E53E3E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="rgba(0,0,0,0.2)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="rgba(0,0,0,0.2)" />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(255,255,255,0.95)",
                      border: "1px solid rgba(43,43,255,0.2)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Area type="monotone" dataKey="entradas" stroke="#2B2BFF" strokeWidth={2} fill="url(#colorEntradas)" name="Entradas" />
                  <Area type="monotone" dataKey="saidas" stroke="#E53E3E" strokeWidth={2} fill="url(#colorSaidas)" name="Saídas" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                <div className="text-center">
                  <Activity size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Nenhuma movimentação registrada</p>
                </div>
              </div>
            )}
          </div>

          {/* Pie chart */}
          <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-5">
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white">Brindes Reservados</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Distribuição por item</p>
            </div>
            {pieData.some((d) => d.value > 0) ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="mt-2 space-y-1.5">
                  {pieData.slice(0, 4).map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-600 dark:text-gray-400 truncate flex-1">{item.name}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-gray-400 text-sm">
                Sem dados
              </div>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent orders */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Últimos Pedidos</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pedidos recentes do sistema</p>
              </div>
              <Link
                href="/pedidos"
                className="flex items-center gap-1 text-xs text-brand-blue hover:text-brand-blue-dark font-medium transition-colors"
              >
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>
            {pedidos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <ShoppingCart size={28} className="mb-2 opacity-30" />
                <p className="text-sm">Nenhum pedido registrado</p>
                <Link href="/pedidos/novo" className="mt-3 text-xs text-brand-blue hover:text-brand-blue-dark">
                  Registrar primeiro pedido →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {pedidos.slice(0, 5).map((pedido) => (
                  <Link
                    key={pedido.id}
                    href={`/pedidos/${pedido.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/3 transition-colors group"
                  >
                    <div className="w-8 h-8 bg-brand-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ShoppingCart size={14} className="text-brand-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{pedido.nome_distribuidor}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pedido.nome_vendedor} • {formatDate(pedido.data_pedido)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        pedido.status === "concluido"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      )}>
                        {pedido.status === "concluido" ? "Concluído" : "Ativo"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Alerts + Activity */}
          <div className="space-y-4">
            {/* Low stock alerts */}
            {lowStockBrindes.length > 0 && (
              <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-5 border border-red-200 dark:border-red-800/30">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={16} className="text-brand-red" />
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Estoque Baixo</h3>
                  <span className="ml-auto text-xs bg-red-100 dark:bg-red-900/30 text-brand-red px-2 py-0.5 rounded-full font-medium">
                    {lowStockBrindes.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {lowStockBrindes.slice(0, 4).map((b) => (
                    <li key={b.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400 truncate flex-1">{b.nome}</span>
                      <span className={cn(
                        "font-semibold ml-2",
                        b.estoque_atual === 0 ? "text-brand-red" : "text-orange-500"
                      )}>
                        {b.estoque_atual} un.
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent activity */}
            <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-brand-blue" />
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Atividades Recentes</h3>
              </div>
              {movimentacoes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Sem atividades recentes</p>
              ) : (
                <ul className="space-y-3">
                  {movimentacoes.slice(0, 6).map((mov) => (
                    <li key={mov.id} className="flex items-start gap-2.5">
                      <div className={cn(
                        "mt-0.5 w-2 h-2 rounded-full flex-shrink-0",
                        mov.tipo === "entrada" ? "bg-green-400" :
                        mov.tipo === "saida" ? "bg-red-400" :
                        mov.tipo === "reserva" ? "bg-brand-blue" : "bg-gray-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                          {mov.descricao || mov.tipo}
                          {(mov.brinde as { nome?: string })?.nome && ` — ${(mov.brinde as { nome?: string }).nome}`}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock size={9} />
                          {timeAgo(mov.created_at)}
                        </p>
                      </div>
                      <span className={cn(
                        "text-xs font-semibold flex-shrink-0",
                        mov.tipo === "entrada" ? "text-green-600 dark:text-green-400" :
                        mov.tipo === "saida" ? "text-red-500" : "text-brand-blue"
                      )}>
                        {mov.tipo === "entrada" ? "+" : mov.tipo === "saida" ? "-" : ""}{mov.quantidade}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: "/estoque/entrada", label: "Nova Entrada", icon: Plus, color: "bg-brand-blue" },
            { href: "/pedidos/novo", label: "Novo Pedido", icon: ShoppingCart, color: "bg-emerald-600" },
            { href: "/estoque", label: "Ver Estoque", icon: Boxes, color: "bg-purple-600" },
            { href: "/relatorios", label: "Relatórios", icon: Activity, color: "bg-orange-500" },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-4 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group"
            >
              <div className={cn("p-2 rounded-xl text-white", color)}>
                <Icon size={16} />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {label}
              </span>
              <ArrowRight size={14} className="ml-auto text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
