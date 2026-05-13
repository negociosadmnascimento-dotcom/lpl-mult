"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Boxes, Search, Plus, Edit2, Trash2, AlertTriangle, X, Save, Package } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { getStockStatus, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Brinde } from "@/lib/types";

type BrindeForm = {
  nome: string;
  categoria: string;
  descricao: string;
  estoque_minimo: number;
};

const CATEGORIAS = ["Vestuário", "Utensílios", "Papelaria", "Acessórios", "Eletrônicos", "Alimentos", "Outros"];

export default function EstoquePage() {
  const [brindes, setBrindes] = useState<Brinde[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Brinde | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BrindeForm>({
    defaultValues: { estoque_minimo: 10 },
  });

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel("estoque-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "brindes" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedido_brindes" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "entradas_estoque" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadData() {
    const { data } = await supabase.from("brindes").select("*").order("nome");
    setBrindes(data || []);
    setLoading(false);
  }

  async function onSubmit(data: BrindeForm) {
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("brindes").update(data).eq("id", editing.id);
        if (error) throw error;
        toast.success("Brinde atualizado!");
      } else {
        const { error } = await supabase.from("brindes").insert({ ...data, estoque_atual: 0, estoque_reservado: 0, ativo: true });
        if (error) throw error;
        toast.success("Brinde cadastrado!");
      }
      resetForm();
      loadData();
    } catch {
      toast.error("Erro ao salvar brinde.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(brinde: Brinde) {
    await supabase.from("brindes").update({ ativo: !brinde.ativo }).eq("id", brinde.id);
    toast.success(brinde.ativo ? "Brinde desativado" : "Brinde reativado");
    loadData();
  }

  function handleEdit(brinde: Brinde) {
    setEditing(brinde);
    setValue("nome", brinde.nome);
    setValue("categoria", brinde.categoria || "");
    setValue("descricao", brinde.descricao || "");
    setValue("estoque_minimo", brinde.estoque_minimo);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    reset({ estoque_minimo: 10 });
    setEditing(null);
    setShowForm(false);
  }

  const filtered = brindes.filter((b) => {
    const matchSearch = !search || b.nome.toLowerCase().includes(search.toLowerCase()) || (b.categoria || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategoria || b.categoria === filterCategoria;
    const status = getStockStatus(b.estoque_atual, b.estoque_minimo);
    const matchStatus = !filterStatus ||
      (filterStatus === "ok" && status === "ok") ||
      (filterStatus === "low" && status === "low") ||
      (filterStatus === "critical" && status === "critical");
    return matchSearch && matchCat && matchStatus;
  });

  const totalEstoque = brindes.filter(b => b.ativo).reduce((s, b) => s + b.estoque_atual, 0);
  const lowCount = brindes.filter(b => b.ativo && b.estoque_atual <= b.estoque_minimo && b.estoque_atual > 0).length;
  const criticalCount = brindes.filter(b => b.ativo && b.estoque_atual === 0).length;

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Estoque" subtitle="Gestão completa de brindes em estoque" />
      <div className="p-4 md:p-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total em Estoque", value: totalEstoque, color: "text-brand-blue", bg: "bg-brand-blue/10" },
            { label: "Tipos de Brindes", value: brindes.filter(b => b.ativo).length, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/20" },
            { label: "Estoque Baixo", value: lowCount, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/20" },
            { label: "Sem Estoque", value: criticalCount, color: "text-brand-red", bg: "bg-red-100 dark:bg-red-900/20", urgent: criticalCount > 0 },
          ].map(({ label, value, color, bg, urgent }) => (
            <div key={label} className={cn("bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-4", urgent && "border border-red-200 dark:border-red-800/30")}>
              <p className={cn("text-2xl font-bold", color)}>{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
              {urgent && value > 0 && (
                <div className="flex items-center gap-1 mt-1.5">
                  <AlertTriangle size={10} className="text-brand-red animate-pulse" />
                  <span className="text-[10px] text-brand-red font-medium">Atenção necessária</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-premium flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-dark text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-brand-blue/20 hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Plus size={16} />
            Novo Brinde
          </button>
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar brindes..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
            />
          </div>
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700 dark:text-gray-300"
          >
            <option value="">Todas categorias</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700 dark:text-gray-300"
          >
            <option value="">Todos status</option>
            <option value="ok">Estoque OK</option>
            <option value="low">Estoque Baixo</option>
            <option value="critical">Sem Estoque</option>
          </select>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-6 border-2 border-brand-blue/20 animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-blue/10 rounded-xl">
                  <Package size={18} className="text-brand-blue" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">{editing ? "Editar Brinde" : "Novo Brinde"}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Preencha os dados do brinde</p>
                </div>
              </div>
              <button onClick={resetForm} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Brinde *</label>
                <input
                  {...register("nome", { required: "Campo obrigatório" })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
                  placeholder="Ex: Camiseta LPL mult"
                />
                {errors.nome && <p className="text-xs text-brand-red">{errors.nome.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
                <select
                  {...register("categoria")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Selecione...</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estoque Mínimo</label>
                <input
                  type="number"
                  min={0}
                  {...register("estoque_minimo", { valueAsNumber: true })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-1.5 lg:col-span-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
                <textarea
                  {...register("descricao")}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all resize-none text-gray-900 dark:text-gray-100"
                  placeholder="Descrição do brinde..."
                />
              </div>

              <div className="lg:col-span-4 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-premium flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-dark text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-brand-blue/20 disabled:opacity-70"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
                  {editing ? "Salvar" : "Cadastrar"}
                </button>
                <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Cards grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl flex flex-col items-center justify-center py-16 text-gray-400">
            <Boxes size={36} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum brinde encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
            {filtered.map((brinde) => {
              const status = getStockStatus(brinde.estoque_atual, brinde.estoque_minimo);
              const disponivel = brinde.estoque_atual - brinde.estoque_reservado;
              return (
                <div
                  key={brinde.id}
                  className={cn(
                    "bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                    !brinde.ativo && "opacity-50",
                    status === "critical" && "border-red-200 dark:border-red-800/30",
                    status === "low" && "border-orange-200 dark:border-orange-800/30"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-brand-blue/10 rounded-xl">
                      <Package size={20} className="text-brand-blue" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {status === "critical" && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-brand-red bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full animate-pulse">
                          <AlertTriangle size={9} /> ZERO
                        </span>
                      )}
                      {status === "low" && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full">
                          <AlertTriangle size={9} /> BAIXO
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 leading-tight">{brinde.nome}</h3>
                  {brinde.categoria && (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 mb-3">
                      {brinde.categoria}
                    </span>
                  )}

                  <div className="space-y-2 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Em estoque</span>
                      <span className={cn(
                        "text-sm font-bold",
                        status === "critical" ? "text-brand-red" :
                        status === "low" ? "text-orange-500" : "text-green-600 dark:text-green-400"
                      )}>
                        {brinde.estoque_atual}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Reservado</span>
                      <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{brinde.estoque_reservado}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Disponível</span>
                      <span className="text-sm font-semibold text-brand-blue">{Math.max(0, disponivel)}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-1.5 mt-2">
                      <div
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          status === "critical" ? "bg-brand-red" :
                          status === "low" ? "bg-orange-400" : "bg-green-500"
                        )}
                        style={{
                          width: `${Math.min(100, (brinde.estoque_atual / Math.max(brinde.estoque_minimo * 3, 1)) * 100)}%`
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Mínimo: {brinde.estoque_minimo} un.</p>
                  </div>

                  <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
                    <button
                      onClick={() => handleEdit(brinde)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-brand-blue transition-colors"
                    >
                      <Edit2 size={12} /> Editar
                    </button>
                    <button
                      onClick={() => toggleAtivo(brinde)}
                      className={cn(
                        "flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs transition-colors",
                        brinde.ativo
                          ? "text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-brand-red"
                          : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      )}
                    >
                      {brinde.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
