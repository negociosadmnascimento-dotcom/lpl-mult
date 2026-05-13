"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Search, Filter, Eye, Plus, Download, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import type { Pedido } from "@/lib/types";

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCampanha, setFilterCampanha] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel("pedidos-list-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedido_brindes" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadData() {
    const { data } = await supabase
      .from("pedidos")
      .select(`
        *,
        pedido_brindes (
          id, quantidade, status_brinde, data_entrega,
          brinde:brindes(id, nome)
        )
      `)
      .order("created_at", { ascending: false });
    setPedidos(data || []);
    setLoading(false);
  }

  const campanhas = [...new Set(pedidos.map((p) => p.campanha).filter(Boolean))];

  const filtered = pedidos.filter((p) => {
    const matchSearch = !search ||
      p.nome_distribuidor.toLowerCase().includes(search.toLowerCase()) ||
      p.nome_vendedor.toLowerCase().includes(search.toLowerCase()) ||
      (p.nota_fiscal || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.numero_pedido || "").toLowerCase().includes(search.toLowerCase());
    const matchCampanha = !filterCampanha || p.campanha === filterCampanha;
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchCampanha && matchStatus;
  });

  const totalPedidos = filtered.length;
  const totalBrindes = filtered.reduce((sum, p) => {
    const pb = p.pedido_brindes || [];
    return sum + pb.reduce((s: number, b: { quantidade: number }) => s + b.quantidade, 0);
  }, 0);
  const pendentes = filtered.filter((p) => {
    const pb = p.pedido_brindes || [];
    return pb.some((b: { status_brinde: string }) => b.status_brinde === "pendente");
  }).length;

  function getPedidoStatus(pedido: Pedido): { label: string; class: string } {
    const pb = pedido.pedido_brindes || [];
    if (pb.length === 0) return { label: "Sem brindes", class: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
    const allEntregue = pb.every((b: { status_brinde: string }) => b.status_brinde === "entregue");
    if (allEntregue) return { label: "Entregue", class: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
    const anyEntregue = pb.some((b: { status_brinde: string }) => b.status_brinde === "entregue");
    if (anyEntregue) return { label: "Parcial", class: "bg-blue-100 text-brand-blue dark:bg-brand-blue/20" };
    return { label: "Pendente", class: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" };
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Pedidos" subtitle="Gerenciamento de pedidos e brindes" />
      <div className="p-4 md:p-6 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total de Pedidos", value: totalPedidos, color: "text-brand-blue", bg: "bg-brand-blue/10" },
            { label: "Brindes Vinculados", value: totalBrindes, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/20" },
            { label: "Com Pendências", value: pendentes, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/20" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", bg)}>
                <TrendingUp size={16} className={color} />
              </div>
              <div>
                <p className={cn("text-xl font-bold", color)}>{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/pedidos/novo"
            className="btn-premium flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-dark text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-brand-blue/20 hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Plus size={16} />
            Novo Pedido
          </Link>
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por distribuidor, vendedor, NF..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
            />
          </div>
          <select
            value={filterCampanha}
            onChange={(e) => setFilterCampanha(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700 dark:text-gray-300"
          >
            <option value="">Todas campanhas</option>
            {campanhas.map((c) => <option key={c!} value={c!}>{c}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700 dark:text-gray-300"
          >
            <option value="">Todos status</option>
            <option value="ativo">Ativo</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
            <h3 className="font-semibold text-gray-900 dark:text-white">Lista de Pedidos</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{filtered.length} pedido{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <ShoppingCart size={36} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum pedido encontrado</p>
              <Link href="/pedidos/novo" className="mt-3 text-sm text-brand-blue hover:text-brand-blue-dark font-medium">
                + Registrar novo pedido
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-premium">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/3">
                    {["Distribuidor / Vendedor", "Indústria", "Campanha", "NF / Pedido", "Data", "Qtd. Brindes", "Status Brinde", "Total", "Ações"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filtered.map((pedido) => {
                    const statusInfo = getPedidoStatus(pedido);
                    const totalBrindesP = (pedido.pedido_brindes || []).reduce((s: number, b: { quantidade: number }) => s + b.quantidade, 0);
                    return (
                      <tr key={pedido.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3.5">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{pedido.nome_distribuidor}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{pedido.nome_vendedor}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-400">{pedido.industria || "-"}</td>
                        <td className="px-4 py-3.5">
                          {pedido.campanha ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 font-medium">
                              {pedido.campanha}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3.5">
                          <div>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{pedido.nota_fiscal || pedido.numero_pedido || "-"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(pedido.data_pedido)}</td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-bold text-brand-blue">{totalBrindesP}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", statusInfo.class)}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(pedido.total_pedido)}
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/pedidos/${pedido.id}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors inline-flex"
                          >
                            <Eye size={15} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
