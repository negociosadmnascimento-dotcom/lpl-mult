"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Package, Building2, User, Calendar, FileText, CheckCircle2, Clock, Trash2, Save, X, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Pedido, PedidoBrinde, Brinde } from "@/lib/types";

export default function PedidoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingDataEntrega, setEditingDataEntrega] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [editingQtd, setEditingQtd] = useState<string | null>(null);
  const [newQtd, setNewQtd] = useState(1);

  useEffect(() => {
    if (id) loadPedido();
    const channel = supabase
      .channel(`pedido-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedido_brindes", filter: `pedido_id=eq.${id}` }, loadPedido)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function loadPedido() {
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        *,
        pedido_brindes (
          id, quantidade, status_brinde, data_entrega, created_at,
          brinde:brindes(id, nome, categoria, estoque_atual, imagem_url)
        )
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      toast.error("Pedido não encontrado");
      router.push("/pedidos");
      return;
    }
    setPedido(data);
    setLoading(false);
  }

  async function updateDataEntrega(pbId: string, date: string) {
    setUpdating(pbId);
    const { error } = await supabase
      .from("pedido_brindes")
      .update({ data_entrega: date || null })
      .eq("id", pbId);

    if (error) {
      toast.error("Erro ao atualizar data de entrega");
    } else {
      toast.success(date ? "Brinde marcado como entregue!" : "Data de entrega removida");
      loadPedido();
    }
    setUpdating(null);
    setEditingDataEntrega(null);
  }

  async function removeBrinde(pbId: string) {
    if (!confirm("Remover este brinde do pedido?")) return;
    setUpdating(pbId);
    const { error } = await supabase.from("pedido_brindes").delete().eq("id", pbId);
    if (error) {
      toast.error("Erro ao remover brinde");
    } else {
      toast.success("Brinde removido do pedido");
      loadPedido();
    }
    setUpdating(null);
  }

  async function updateQuantidade(pbId: string, qtd: number) {
    if (qtd < 1) return;
    setUpdating(pbId);
    const { error } = await supabase.from("pedido_brindes").update({ quantidade: qtd }).eq("id", pbId);
    if (error) {
      toast.error("Erro ao atualizar quantidade");
    } else {
      toast.success("Quantidade atualizada");
      loadPedido();
    }
    setUpdating(null);
    setEditingQtd(null);
  }

  async function deletePedido() {
    if (!confirm("Confirmar exclusão deste pedido? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("pedidos").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir pedido");
    } else {
      toast.success("Pedido excluído com sucesso");
      router.push("/pedidos");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <Header title="Detalhes do Pedido" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!pedido) return null;

  const pb = pedido.pedido_brindes || [];
  const totalBrindes = pb.reduce((s: number, b: PedidoBrinde) => s + b.quantidade, 0);
  const entregues = pb.filter((b: PedidoBrinde) => b.status_brinde === "entregue").length;
  const pendentes = pb.filter((b: PedidoBrinde) => b.status_brinde === "pendente").length;

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Detalhes do Pedido" subtitle={`${pedido.nome_distribuidor} • ${pedido.nome_vendedor}`} />
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/pedidos" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-blue transition-colors">
            <ArrowLeft size={15} />
            Voltar para Pedidos
          </Link>
          <button
            onClick={deletePedido}
            className="flex items-center gap-1.5 text-xs text-brand-red hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Trash2 size={13} />
            Excluir Pedido
          </button>
        </div>

        {/* Header card */}
        <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-brand-blue/10 rounded-2xl">
                <Building2 size={24} className="text-brand-blue" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{pedido.nome_distribuidor}</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{pedido.industria || "Indústria não informada"}</p>
                {pedido.campanha && (
                  <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 font-medium">
                    🎯 {pedido.campanha}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="text-center px-4 py-2 bg-brand-blue/10 rounded-xl">
                <p className="text-xl font-bold text-brand-blue">{totalBrindes}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Brindes</p>
              </div>
              <div className="text-center px-4 py-2 bg-green-100 dark:bg-green-900/20 rounded-xl">
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{entregues}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Entregues</p>
              </div>
              <div className="text-center px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl">
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{pendentes}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pendentes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <User size={15} className="text-brand-blue" /> Equipe
            </h3>
            <div className="space-y-3">
              {[
                { label: "Vendedor", value: pedido.nome_vendedor },
                { label: "Supervisor", value: pedido.nome_supervisor || "-" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <FileText size={15} className="text-brand-blue" /> Documentação
            </h3>
            <div className="space-y-3">
              {[
                { label: "NF / Pedido", value: pedido.nota_fiscal || pedido.numero_pedido || "-" },
                { label: "Data do Pedido", value: formatDate(pedido.data_pedido) },
                { label: "Qtd. Pedidos", value: pedido.quantidade_pedidos?.toString() || "1" },
                { label: "Total", value: formatCurrency(pedido.total_pedido) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Observações */}
        {pedido.observacoes && (
          <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Observações</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{pedido.observacoes}</p>
          </div>
        )}

        {/* Brindes table */}
        <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
            <h3 className="font-semibold text-gray-900 dark:text-white">Brindes do Pedido</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pb.length} brinde{pb.length !== 1 ? "s" : ""} vinculado{pb.length !== 1 ? "s" : ""}</p>
          </div>

          {pb.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-400">
              <Package size={28} className="mb-2 opacity-30" />
              <p className="text-sm">Nenhum brinde vinculado a este pedido</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-premium">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/3">
                    {["Brinde", "Categoria", "Quantidade", "Data de Entrega", "Status", "Ações"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {pb.map((item: PedidoBrinde) => {
                    const b = item.brinde as Brinde;
                    const isEditing = editingDataEntrega === item.id;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-brand-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Package size={14} className="text-brand-blue" />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{b?.nome || "-"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {b?.categoria && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400">
                              {b.categoria}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {editingQtd === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setNewQtd((v) => Math.max(1, v - 1))}
                                className="p-1 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                              >
                                <Minus size={11} />
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={newQtd}
                                onChange={(e) => setNewQtd(Math.max(1, Number(e.target.value)))}
                                className="w-14 text-center px-2 py-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-900 dark:text-gray-100"
                              />
                              <button
                                onClick={() => setNewQtd((v) => v + 1)}
                                className="p-1 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                              >
                                <Plus size={11} />
                              </button>
                              <button
                                onClick={() => updateQuantidade(item.id, newQtd)}
                                disabled={!!updating}
                                className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-200 transition-colors"
                              >
                                {updating === item.id ? <div className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" /> : <Save size={11} />}
                              </button>
                              <button
                                onClick={() => setEditingQtd(null)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-brand-blue">{item.quantidade}</span>
                              <button
                                onClick={() => { setEditingQtd(item.id); setNewQtd(item.quantidade); }}
                                className="p-1 rounded text-gray-300 hover:text-brand-blue transition-colors"
                              >
                                <Edit2 size={11} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                              />
                              <button
                                onClick={() => updateDataEntrega(item.id, newDate)}
                                disabled={!!updating}
                                className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-200 transition-colors"
                              >
                                {updating === item.id ? (
                                  <div className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                                ) : (
                                  <Save size={12} />
                                )}
                              </button>
                              <button
                                onClick={() => setEditingDataEntrega(null)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {item.data_entrega ? formatDate(item.data_entrega) : "-"}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingDataEntrega(item.id);
                                  setNewDate(item.data_entrega || "");
                                }}
                                className="p-1 rounded text-gray-300 hover:text-brand-blue transition-colors"
                              >
                                <Edit2 size={11} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {item.status_brinde === "entregue" ? (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                              <CheckCircle2 size={12} /> Entregue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 font-medium">
                              <Clock size={12} /> Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {item.status_brinde === "pendente" && (
                              <button
                                onClick={() => {
                                  setEditingDataEntrega(item.id);
                                  setNewDate(new Date().toISOString().split("T")[0]);
                                }}
                                className="text-xs text-brand-blue hover:text-brand-blue-dark font-medium transition-colors"
                              >
                                Marcar entregue
                              </button>
                            )}
                            <button
                              onClick={() => removeBrinde(item.id)}
                              disabled={!!updating}
                              className="p-1.5 rounded-lg text-gray-300 hover:text-brand-red hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Remover brinde do pedido"
                            >
                              {updating === item.id
                                ? <div className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                                : <Trash2 size={13} />}
                            </button>
                          </div>
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
