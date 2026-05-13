"use client";

import { useState, useEffect } from "react";
import {
  BarChart3, Download, FileText, Package, ShoppingCart,
  TrendingDown, Users, Calendar, Filter
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from "recharts";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Pedido, Brinde, PedidoBrinde } from "@/lib/types";

export default function RelatoriosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [brindes, setBrindes] = useState<Brinde[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"estoque" | "pedidos" | "distribuidor" | "periodo">("estoque");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [pedRes, brindRes] = await Promise.all([
      supabase.from("pedidos").select(`*, pedido_brindes(*, brinde:brindes(id, nome, categoria))`).order("data_pedido", { ascending: false }),
      supabase.from("brindes").select("*").eq("ativo", true).order("nome"),
    ]);
    setPedidos(pedRes.data || []);
    setBrindes(brindRes.data || []);
    setLoading(false);
  }

  const filteredPedidos = pedidos.filter((p) => {
    if (!dateFrom && !dateTo) return true;
    const d = p.data_pedido;
    return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
  });

  // Distribuidor stats
  const distribStats = filteredPedidos.reduce<Record<string, { pedidos: number; brindes: number; total: number }>>((acc, p) => {
    if (!acc[p.nome_distribuidor]) acc[p.nome_distribuidor] = { pedidos: 0, brindes: 0, total: 0 };
    acc[p.nome_distribuidor].pedidos += 1;
    acc[p.nome_distribuidor].brindes += (p.pedido_brindes || []).reduce((s: number, b: PedidoBrinde) => s + b.quantidade, 0);
    acc[p.nome_distribuidor].total += p.total_pedido || 0;
    return acc;
  }, {});
  const distribList = Object.entries(distribStats)
    .map(([nome, s]) => ({ nome, ...s }))
    .sort((a, b) => b.brindes - a.brindes)
    .slice(0, 10);

  // Vendedor stats
  const vendedorStats = filteredPedidos.reduce<Record<string, { pedidos: number; brindes: number }>>((acc, p) => {
    if (!acc[p.nome_vendedor]) acc[p.nome_vendedor] = { pedidos: 0, brindes: 0 };
    acc[p.nome_vendedor].pedidos += 1;
    acc[p.nome_vendedor].brindes += (p.pedido_brindes || []).reduce((s: number, b: PedidoBrinde) => s + b.quantidade, 0);
    return acc;
  }, {});
  const vendedorList = Object.entries(vendedorStats)
    .map(([nome, s]) => ({ nome, ...s }))
    .sort((a, b) => b.brindes - a.brindes)
    .slice(0, 10);

  // Brinde stats from pedidos
  const brindeStats = filteredPedidos.reduce<Record<string, { nome: string; qtd: number }>>((acc, p) => {
    (p.pedido_brindes || []).forEach((pb: PedidoBrinde) => {
      const b = pb.brinde as Brinde;
      if (!b) return;
      if (!acc[b.id]) acc[b.id] = { nome: b.nome, qtd: 0 };
      acc[b.id].qtd += pb.quantidade;
    });
    return acc;
  }, {});
  const brindeList = Object.entries(brindeStats)
    .map(([, v]) => v)
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 8);

  // Period chart data
  const periodMap: Record<string, { mes: string; pedidos: number; brindes: number }> = {};
  filteredPedidos.forEach((p) => {
    const d = new Date(p.data_pedido);
    const key = `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear().toString().slice(2)}`;
    if (!periodMap[key]) periodMap[key] = { mes: key, pedidos: 0, brindes: 0 };
    periodMap[key].pedidos += 1;
    periodMap[key].brindes += (p.pedido_brindes || []).reduce((s: number, b: PedidoBrinde) => s + b.quantidade, 0);
  });
  const periodData = Object.values(periodMap).slice(-12);

  async function exportToExcel() {
    try {
      const { utils, writeFile } = await import("xlsx");
      const wb = utils.book_new();

      // Estoque sheet
      const estoqueData = brindes.map((b) => ({
        "Nome": b.nome,
        "Categoria": b.categoria || "",
        "Estoque Atual": b.estoque_atual,
        "Reservado": b.estoque_reservado,
        "Disponível": b.estoque_atual - b.estoque_reservado,
        "Mínimo": b.estoque_minimo,
        "Status": b.estoque_atual === 0 ? "Crítico" : b.estoque_atual <= b.estoque_minimo ? "Baixo" : "OK",
      }));
      utils.book_append_sheet(wb, utils.json_to_sheet(estoqueData), "Estoque");

      // Pedidos sheet
      const pedidosData = filteredPedidos.map((p) => ({
        "Distribuidor": p.nome_distribuidor,
        "Vendedor": p.nome_vendedor,
        "Supervisor": p.nome_supervisor || "",
        "Indústria": p.industria || "",
        "Campanha": p.campanha || "",
        "NF/Pedido": p.nota_fiscal || p.numero_pedido || "",
        "Data": formatDate(p.data_pedido),
        "Qtd. Pedidos": p.quantidade_pedidos,
        "Total (R$)": p.total_pedido || 0,
      }));
      utils.book_append_sheet(wb, utils.json_to_sheet(pedidosData), "Pedidos");

      // Distribuidor sheet
      const distribData = distribList.map((d) => ({
        "Distribuidor": d.nome,
        "Total Pedidos": d.pedidos,
        "Total Brindes": d.brindes,
        "Valor Total (R$)": formatCurrency(d.total),
      }));
      utils.book_append_sheet(wb, utils.json_to_sheet(distribData), "Distribuidores");

      writeFile(wb, `LPL_mult_Relatorio_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Relatório Excel exportado com sucesso!");
    } catch {
      toast.error("Erro ao exportar Excel.");
    }
  }

  async function exportToPDF() {
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();

      // Header
      doc.setFillColor(43, 43, 255);
      doc.rect(0, 0, 210, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("LPL mult - Relatório de Brindes", 14, 18);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 26);

      // Estoque
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório de Estoque", 14, 42);

      autoTable(doc, {
        startY: 47,
        head: [["Brinde", "Categoria", "Estoque", "Reservado", "Disponível", "Status"]],
        body: brindes.map((b) => [
          b.nome,
          b.categoria || "-",
          b.estoque_atual,
          b.estoque_reservado,
          b.estoque_atual - b.estoque_reservado,
          b.estoque_atual === 0 ? "CRÍTICO" : b.estoque_atual <= b.estoque_minimo ? "BAIXO" : "OK",
        ]),
        headStyles: { fillColor: [43, 43, 255], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [240, 240, 255] },
      });

      const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // Pedidos
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório de Pedidos", 14, lastY);

      autoTable(doc, {
        startY: lastY + 5,
        head: [["Distribuidor", "Vendedor", "Campanha", "Data", "Total (R$)"]],
        body: filteredPedidos.slice(0, 30).map((p) => [
          p.nome_distribuidor,
          p.nome_vendedor,
          p.campanha || "-",
          formatDate(p.data_pedido),
          formatCurrency(p.total_pedido),
        ]),
        headStyles: { fillColor: [43, 43, 255], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [240, 240, 255] },
      });

      doc.save(`LPL_mult_Relatorio_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Relatório PDF exportado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar PDF.");
    }
  }

  const tabs = [
    { id: "estoque", label: "Estoque", icon: Package },
    { id: "pedidos", label: "Pedidos", icon: ShoppingCart },
    { id: "distribuidor", label: "Distribuidores", icon: Users },
    { id: "periodo", label: "Por Período", icon: Calendar },
  ] as const;

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Relatórios" subtitle="Análises e exportações do sistema" />
      <div className="p-4 md:p-6 space-y-6">

        {/* Export + filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700 dark:text-gray-300"
              />
              <span className="text-gray-400 text-xs">até</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700 dark:text-gray-300"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors shadow-lg shadow-emerald-600/20"
            >
              <Download size={14} />
              Excel
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white text-sm font-medium transition-colors shadow-lg shadow-red-500/20"
            >
              <FileText size={14} />
              PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-2xl w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                activeTab === id
                  ? "bg-white dark:bg-brand-blue text-brand-blue dark:text-white shadow-md"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Estoque tab */}
            {activeTab === "estoque" && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total em Estoque", value: brindes.reduce((s, b) => s + b.estoque_atual, 0), color: "text-brand-blue" },
                    { label: "Reservados", value: brindes.reduce((s, b) => s + b.estoque_reservado, 0), color: "text-purple-600 dark:text-purple-400" },
                    { label: "Estoque Baixo", value: brindes.filter(b => b.estoque_atual <= b.estoque_minimo && b.estoque_atual > 0).length, color: "text-orange-500" },
                    { label: "Sem Estoque", value: brindes.filter(b => b.estoque_atual === 0).length, color: "text-brand-red" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-4">
                      <p className={cn("text-2xl font-bold", color)}>{value}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Estoque por Brinde</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full table-premium">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-white/3">
                          {["Brinde", "Categoria", "Em Estoque", "Reservado", "Disponível", "Mínimo", "Status"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {brindes.map((b) => {
                          const status = b.estoque_atual === 0 ? "Crítico" : b.estoque_atual <= b.estoque_minimo ? "Baixo" : "OK";
                          return (
                            <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{b.nome}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{b.categoria || "-"}</td>
                              <td className="px-4 py-3 text-sm font-bold text-brand-blue">{b.estoque_atual}</td>
                              <td className="px-4 py-3 text-sm text-purple-600 dark:text-purple-400">{b.estoque_reservado}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">{b.estoque_atual - b.estoque_reservado}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{b.estoque_minimo}</td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full font-medium",
                                  status === "OK" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                  status === "Baixo" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                  "bg-red-100 text-brand-red dark:bg-red-900/30"
                                )}>
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Pedidos tab */}
            {activeTab === "pedidos" && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-5">Brindes Mais Distribuídos</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={brindeList} margin={{ top: 5, right: 5, bottom: 30, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="nome" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "10px" }} />
                      <Bar dataKey="qtd" name="Quantidade" fill="#2B2BFF" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Detalhamento de Pedidos</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{filteredPedidos.length} pedidos no período</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full table-premium">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-white/3">
                          {["Distribuidor", "Vendedor", "Campanha", "Data", "Qtd. Brindes", "Total"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {filteredPedidos.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.nome_distribuidor}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.nome_vendedor}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.campanha || "-"}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(p.data_pedido)}</td>
                            <td className="px-4 py-3 text-sm font-bold text-brand-blue">
                              {(p.pedido_brindes || []).reduce((s: number, b: PedidoBrinde) => s + b.quantidade, 0)}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(p.total_pedido)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Distribuidor tab */}
            {activeTab === "distribuidor" && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-5">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-5">Top Distribuidores (Brindes)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={distribList.slice(0, 6)} layout="vertical" margin={{ left: 20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="nome" type="category" tick={{ fontSize: 10 }} width={80} />
                        <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "10px" }} />
                        <Bar dataKey="brindes" name="Brindes" fill="#2B2BFF" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-5">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-5">Top Vendedores</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={vendedorList.slice(0, 6)} layout="vertical" margin={{ left: 20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="nome" type="category" tick={{ fontSize: 10 }} width={80} />
                        <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "10px" }} />
                        <Bar dataKey="brindes" name="Brindes" fill="#E53E3E" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Ranking de Distribuidores</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full table-premium">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-white/3">
                          {["#", "Distribuidor", "Total Pedidos", "Total Brindes", "Valor Total"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {distribList.map((d, i) => (
                          <tr key={d.nome} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                            <td className="px-4 py-3">
                              <span className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                i === 0 ? "bg-yellow-100 text-yellow-700" :
                                i === 1 ? "bg-gray-100 text-gray-600" :
                                i === 2 ? "bg-orange-100 text-orange-700" :
                                "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                              )}>
                                {i + 1}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{d.nome}</td>
                            <td className="px-4 py-3 text-sm text-brand-blue font-bold">{d.pedidos}</td>
                            <td className="px-4 py-3 text-sm font-bold text-purple-600 dark:text-purple-400">{d.brindes}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(d.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Periodo tab */}
            {activeTab === "periodo" && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-5">Evolução de Pedidos e Brindes por Mês</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={periodData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "10px" }} />
                      <Legend />
                      <Line type="monotone" dataKey="pedidos" stroke="#2B2BFF" strokeWidth={2} dot={{ r: 4 }} name="Pedidos" />
                      <Line type="monotone" dataKey="brindes" stroke="#E53E3E" strokeWidth={2} dot={{ r: 4 }} name="Brindes" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Resumo por Período</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full table-premium">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-white/3">
                          {["Período", "Pedidos", "Brindes Distribuídos"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {periodData.map((d) => (
                          <tr key={d.mes} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{d.mes}</td>
                            <td className="px-4 py-3 text-sm font-bold text-brand-blue">{d.pedidos}</td>
                            <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400">{d.brindes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
