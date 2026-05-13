"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { PackagePlus, Search, Filter, Edit2, Trash2, X, Save, Calendar, User, Package, ChevronDown } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { formatDate, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { EntradaEstoque, Brinde } from "@/lib/types";

type FormData = {
  brinde_nome: string;
  brinde_id: string;
  quantidade: number;
  data_entrada: string;
  responsavel: string;
  observacoes?: string;
};

/* ---------- Autocomplete component ---------- */
function BrindeCombobox({
  brindes,
  value,
  onChange,
  onIdChange,
  error,
}: {
  brindes: Brinde[];
  value: string;
  onChange: (nome: string) => void;
  onIdChange: (id: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = brindes.filter((b) =>
    b.nome.toLowerCase().includes(value.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Package size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onIdChange("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Digite o nome do brinde..."
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-[#151535] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">
              Nenhum brinde encontrado{value && ` — será criado: "${value}"`}
            </div>
          ) : (
            filtered.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  onChange(b.nome);
                  onIdChange(b.id);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-brand-blue/5 dark:hover:bg-white/5 text-left transition-colors group"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">{b.nome}</span>
                <span className="text-xs text-gray-400 group-hover:text-brand-blue">
                  {b.categoria && <span className="mr-2 text-[10px] px-1.5 py-0.5 rounded bg-brand-blue/10 text-brand-blue">{b.categoria}</span>}
                  estoque: {b.estoque_atual}
                </span>
              </button>
            ))
          )}
        </div>
      )}
      {error && <p className="text-xs text-brand-red mt-1">{error}</p>}
    </div>
  );
}

/* ---------- Page ---------- */
export default function EntradaEstoquePage() {
  const [entradas, setEntradas] = useState<EntradaEstoque[]>([]);
  const [brindes, setBrindes] = useState<Brinde[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EntradaEstoque | null>(null);
  const [search, setSearch] = useState("");
  const [filterResponsavel, setFilterResponsavel] = useState("");
  const [brindeNome, setBrindeNome] = useState("");
  const [brindeId, setBrindeId] = useState("");
  const [brindeError, setBrindeError] = useState("");

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: { data_entrada: new Date().toISOString().split("T")[0] },
  });

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel("entradas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "entradas_estoque" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadData() {
    const [entradasRes, brindRes] = await Promise.all([
      supabase
        .from("entradas_estoque")
        .select("*, brinde:brindes(id,nome,categoria,estoque_atual)")
        .order("created_at", { ascending: false }),
      supabase.from("brindes").select("*").eq("ativo", true).order("nome"),
    ]);
    setEntradas(entradasRes.data || []);
    setBrindes(brindRes.data || []);
    setLoading(false);
  }

  async function resolveOrCreateBrinde(nome: string, id: string): Promise<string | null> {
    if (id) return id;
    if (!nome.trim()) return null;

    // Check if a brinde with this name already exists (case-insensitive)
    const existing = brindes.find((b) => b.nome.toLowerCase() === nome.trim().toLowerCase());
    if (existing) return existing.id;

    // Create a new brinde
    const { data, error } = await supabase
      .from("brindes")
      .insert({ nome: nome.trim(), estoque_atual: 0, estoque_reservado: 0, estoque_minimo: 10, ativo: true })
      .select()
      .single();

    if (error || !data) {
      toast.error("Erro ao criar brinde.");
      return null;
    }
    return data.id;
  }

  async function onSubmit(data: FormData) {
    setBrindeError("");
    if (!brindeNome.trim()) {
      setBrindeError("Informe o nome do brinde");
      return;
    }
    setSaving(true);
    try {
      const resolvedId = await resolveOrCreateBrinde(brindeNome, brindeId);
      if (!resolvedId) { setSaving(false); return; }

      if (editing) {
        const diff = data.quantidade - editing.quantidade;
        const { error } = await supabase
          .from("entradas_estoque")
          .update({
            brinde_id: resolvedId,
            quantidade: data.quantidade,
            data_entrada: data.data_entrada,
            responsavel: data.responsavel,
            observacoes: data.observacoes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editing.id);
        if (error) throw error;
        if (diff !== 0) {
          const { data: cur } = await supabase.from("brindes").select("estoque_atual").eq("id", resolvedId).single();
          if (cur) await supabase.from("brindes").update({ estoque_atual: cur.estoque_atual + diff }).eq("id", resolvedId);
        }
        toast.success("Entrada atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("entradas_estoque").insert({
          brinde_id: resolvedId,
          quantidade: data.quantidade,
          data_entrada: data.data_entrada,
          responsavel: data.responsavel,
          observacoes: data.observacoes || null,
        });
        if (error) throw error;
        toast.success("Entrada registrada com sucesso!");
      }
      resetForm();
      loadData();
    } catch (err) {
      toast.error("Erro ao salvar. Tente novamente.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entrada: EntradaEstoque) {
    if (!confirm(`Confirmar exclusão de ${entrada.quantidade} unidades?`)) return;
    const { error } = await supabase.from("entradas_estoque").delete().eq("id", entrada.id);
    if (error) {
      toast.error("Erro ao excluir.");
    } else {
      toast.success("Entrada excluída.");
      loadData();
    }
  }

  function handleEdit(entrada: EntradaEstoque) {
    setEditing(entrada);
    const b = entrada.brinde as Brinde;
    setBrindeNome(b?.nome || "");
    setBrindeId(entrada.brinde_id);
    setValue("quantidade", entrada.quantidade);
    setValue("data_entrada", entrada.data_entrada);
    setValue("responsavel", entrada.responsavel);
    setValue("observacoes", entrada.observacoes || "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    reset({ data_entrada: new Date().toISOString().split("T")[0] });
    setEditing(null);
    setBrindeNome("");
    setBrindeId("");
    setBrindeError("");
    setShowForm(false);
  }

  const filtered = entradas.filter((e) => {
    const brindeName = (e.brinde as Brinde)?.nome?.toLowerCase() || "";
    const matchSearch = !search || brindeName.includes(search.toLowerCase()) || e.responsavel.toLowerCase().includes(search.toLowerCase());
    const matchResp = !filterResponsavel || e.responsavel.toLowerCase().includes(filterResponsavel.toLowerCase());
    return matchSearch && matchResp;
  });

  const responsaveis = [...new Set(entradas.map((e) => e.responsavel))];

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Entrada de Brindes" subtitle="Registre novas entradas no estoque" />
      <div className="p-4 md:p-6 space-y-6">

        {/* Action bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-premium flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-dark text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-brand-blue/20 hover:-translate-y-0.5"
          >
            <PackagePlus size={16} />
            Nova Entrada
          </button>
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por brinde ou responsável..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
          <div className="relative">
            <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={filterResponsavel}
              onChange={(e) => setFilterResponsavel(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue appearance-none transition-all text-gray-700 dark:text-gray-300"
            >
              <option value="">Todos responsáveis</option>
              {responsaveis.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-[#0d0d2e] rounded-2xl p-6 border-2 border-brand-blue/20 shadow-lg animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-blue/10 rounded-xl">
                  <PackagePlus size={18} className="text-brand-blue" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {editing ? "Editar Entrada" : "Nova Entrada de Estoque"}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Preencha os dados da entrada</p>
                </div>
              </div>
              <button onClick={resetForm} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Brinde — autocomplete */}
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Package size={13} /> Brinde *
                </label>
                <BrindeCombobox
                  brindes={brindes}
                  value={brindeNome}
                  onChange={setBrindeNome}
                  onIdChange={setBrindeId}
                  error={brindeError}
                />
              </div>

              {/* Quantidade */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantidade *</label>
                <input
                  type="number"
                  min={1}
                  {...register("quantidade", { required: "Informe a quantidade", min: { value: 1, message: "Mínimo 1" }, valueAsNumber: true })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
                  placeholder="0"
                />
                {errors.quantidade && <p className="text-xs text-brand-red">{errors.quantidade.message}</p>}
              </div>

              {/* Data */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Calendar size={13} /> Data de Entrada *
                </label>
                <input
                  type="date"
                  {...register("data_entrada", { required: "Informe a data" })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
                />
                {errors.data_entrada && <p className="text-xs text-brand-red">{errors.data_entrada.message}</p>}
              </div>

              {/* Responsável */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <User size={13} /> Responsável *
                </label>
                <input
                  {...register("responsavel", { required: "Informe o responsável" })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
                  placeholder="Nome do responsável"
                />
                {errors.responsavel && <p className="text-xs text-brand-red">{errors.responsavel.message}</p>}
              </div>

              {/* Observações */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Observações</label>
                <textarea
                  {...register("observacoes")}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all resize-none text-gray-900 dark:text-gray-100"
                  placeholder="Observações opcionais..."
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-premium flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-dark text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-brand-blue/20 disabled:opacity-70"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  {editing ? "Salvar Alterações" : "Registrar Entrada"}
                </button>
                <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-[#0d0d2e] rounded-2xl overflow-hidden shadow border border-gray-100 dark:border-white/5">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Histórico de Entradas</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <PackagePlus size={36} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhuma entrada encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-premium">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/3">
                    {["Brinde", "Categoria", "Quantidade", "Data Entrada", "Responsável", "Observações", "Ações"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filtered.map((entrada) => (
                    <tr key={entrada.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-brand-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package size={14} className="text-brand-blue" />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {(entrada.brinde as Brinde)?.nome || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue font-medium">
                          {(entrada.brinde as Brinde)?.categoria || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">+{entrada.quantidade}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">{formatDate(entrada.data_entrada)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">{entrada.responsavel}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-500 max-w-[200px] truncate">{entrada.observacoes || "-"}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleEdit(entrada)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(entrada)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-red hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
