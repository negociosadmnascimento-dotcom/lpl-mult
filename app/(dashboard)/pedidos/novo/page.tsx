"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { ArrowLeft, Save, Plus, Trash2, ShoppingCart, Package, Building2, User, FileText, Calendar, Hash, BadgeDollarSign } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Brinde } from "@/lib/types";

type BrindeItem = {
  brinde_id: string;
  quantidade: number;
  data_entrega: string;
};

type FormData = {
  nome_distribuidor: string;
  industria: string;
  nome_vendedor: string;
  nome_supervisor: string;
  nota_fiscal: string;
  numero_pedido: string;
  data_pedido: string;
  campanha: string;
  quantidade_pedidos: number;
  total_pedido: number;
  observacoes: string;
  brindes: BrindeItem[];
};

export default function NovoPedidoPage() {
  const router = useRouter();
  const [brindes, setBrindes] = useState<Brinde[]>([]);
  const [saving, setSaving] = useState(false);
  const [campanhas, setCampanhas] = useState<string[]>([]);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      data_pedido: new Date().toISOString().split("T")[0],
      quantidade_pedidos: 1,
      brindes: [{ brinde_id: "", quantidade: 1, data_entrega: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "brindes" });

  useEffect(() => {
    async function load() {
      const [brindRes, campRes] = await Promise.all([
        supabase.from("brindes").select("*").eq("ativo", true).order("nome"),
        supabase.from("campanhas").select("nome").eq("ativa", true),
      ]);
      setBrindes(brindRes.data || []);
      setCampanhas((campRes.data || []).map((c: { nome: string }) => c.nome));
    }
    load();
    const channel = supabase
      .channel("novo-pedido-brindes")
      .on("postgres_changes", { event: "*", schema: "public", table: "brindes" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const { data: pedidoData, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          nome_distribuidor: data.nome_distribuidor,
          industria: data.industria || null,
          nome_vendedor: data.nome_vendedor,
          nome_supervisor: data.nome_supervisor || null,
          nota_fiscal: data.nota_fiscal || null,
          numero_pedido: data.numero_pedido || null,
          data_pedido: data.data_pedido,
          campanha: data.campanha || null,
          quantidade_pedidos: data.quantidade_pedidos,
          total_pedido: data.total_pedido || null,
          observacoes: data.observacoes || null,
          status: "ativo",
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      const brindesToInsert = data.brindes
        .filter((b) => b.brinde_id)
        .map((b) => ({
          pedido_id: pedidoData.id,
          brinde_id: b.brinde_id,
          quantidade: b.quantidade,
          data_entrega: b.data_entrega || null,
        }));

      if (brindesToInsert.length > 0) {
        const { error: brindeError } = await supabase.from("pedido_brindes").insert(brindesToInsert);
        if (brindeError) throw brindeError;
      }

      toast.success("Pedido registrado com sucesso!");
      router.push(`/pedidos/${pedidoData.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar pedido. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const watchedBrindes = watch("brindes");

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Novo Pedido" subtitle="Registre um novo pedido de brindes" />
      <div className="p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          {/* Back */}
          <Link href="/pedidos" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-blue transition-colors mb-5">
            <ArrowLeft size={15} />
            Voltar para Pedidos
          </Link>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Distribuidor info */}
            <div className="bg-white dark:bg-[#0d0d2e] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 bg-brand-blue/10 rounded-xl">
                  <Building2 size={18} className="text-brand-blue" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">Informações do Distribuidor</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Dados do distribuidor e vendedor</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Distribuidor *</label>
                  <input
                    {...register("nome_distribuidor", { required: "Campo obrigatório" })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
                    placeholder="Nome do distribuidor"
                  />
                  {errors.nome_distribuidor && <p className="text-xs text-brand-red">{errors.nome_distribuidor.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Indústria</label>
                  <input
                    {...register("industria")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
                    placeholder="Nome da indústria"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Vendedor *</label>
                  <input
                    {...register("nome_vendedor", { required: "Campo obrigatório" })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
                    placeholder="Nome do vendedor"
                  />
                  {errors.nome_vendedor && <p className="text-xs text-brand-red">{errors.nome_vendedor.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Supervisor</label>
                  <input
                    {...register("nome_supervisor")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
                    placeholder="Nome do supervisor"
                  />
                </div>
              </div>
            </div>

            {/* Pedido info */}
            <div className="bg-white dark:bg-[#0d0d2e] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl">
                  <FileText size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">Dados do Pedido</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Nota fiscal, campanha e valores</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <FileText size={12} /> Nota Fiscal / N° Pedido
                  </label>
                  <input
                    {...register("nota_fiscal")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
                    placeholder="NF-001234"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Calendar size={12} /> Data do Pedido *
                  </label>
                  <input
                    type="date"
                    {...register("data_pedido", { required: "Campo obrigatório" })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
                  />
                  {errors.data_pedido && <p className="text-xs text-brand-red">{errors.data_pedido.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Campanha</label>
                  <input
                    {...register("campanha")}
                    list="campanhas-list"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
                    placeholder="Digite ou selecione a campanha..."
                    autoComplete="off"
                  />
                  <datalist id="campanhas-list">
                    {campanhas.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Hash size={12} /> Qtd. de Pedidos
                  </label>
                  <input
                    type="number"
                    min={1}
                    {...register("quantidade_pedidos", { valueAsNumber: true, min: 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <BadgeDollarSign size={12} /> Total do Pedido (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    {...register("total_pedido", { valueAsNumber: true })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-gray-900 dark:text-gray-100"
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Observações</label>
                  <textarea
                    {...register("observacoes")}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all resize-none text-gray-900 dark:text-gray-100"
                    placeholder="Observações adicionais..."
                  />
                </div>
              </div>
            </div>

            {/* Brindes */}
            <div className="bg-white dark:bg-[#0d0d2e] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
                    <Package size={18} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">Brindes do Pedido</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Adicione os brindes vinculados a este pedido</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => append({ brinde_id: "", quantidade: 1, data_entrega: "" })}
                  className="flex items-center gap-1.5 text-xs bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue px-3 py-1.5 rounded-xl font-medium transition-colors"
                >
                  <Plus size={13} />
                  Adicionar Brinde
                </button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => {
                  const selectedBrinde = brindes.find((b) => b.id === watchedBrindes?.[index]?.brinde_id);
                  const dataEntrega = watchedBrindes?.[index]?.data_entrega;
                  const statusBrinde = dataEntrega ? "entregue" : "pendente";

                  return (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-gray-50 dark:bg-white/3 rounded-xl border border-gray-100 dark:border-white/5 animate-fade-in-up">
                      <div className="md:col-span-4 space-y-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Brinde *</label>
                        <select
                          {...register(`brindes.${index}.brinde_id`, { required: "Selecione" })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-900 dark:text-gray-100"
                        >
                          <option value="">Selecione o brinde...</option>
                          {brindes.map((b) => (
                            <option key={b.id} value={b.id} disabled={b.estoque_atual <= 0}>
                              {b.nome} {b.estoque_atual <= 0 ? "(sem estoque)" : `(${b.estoque_atual} un.)`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Quantidade *</label>
                        <input
                          type="number"
                          min={1}
                          max={selectedBrinde?.estoque_atual || 9999}
                          {...register(`brindes.${index}.quantidade`, { valueAsNumber: true, min: 1 })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Data de Entrega</label>
                        <input
                          type="date"
                          {...register(`brindes.${index}.data_entrega`)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
                        <div className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e]">
                          <span className={cn(
                            "text-xs font-semibold",
                            statusBrinde === "entregue" ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"
                          )}>
                            {statusBrinde === "entregue" ? "✓ Entregue" : "⏳ Pendente"}
                          </span>
                        </div>
                      </div>

                      <div className="md:col-span-1 flex items-end justify-end">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-2 rounded-xl text-gray-400 hover:text-brand-red hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {selectedBrinde && (
                        <div className="md:col-span-12 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Package size={11} className="text-brand-blue" />
                          Estoque disponível: <span className="font-semibold text-brand-blue">{selectedBrinde.estoque_atual} unidades</span>
                          {selectedBrinde.estoque_atual <= selectedBrinde.estoque_minimo && (
                            <span className="text-brand-red font-medium">⚠ Estoque baixo</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-premium flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-dark text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-brand-blue/20 disabled:opacity-70 hover:-translate-y-0.5"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {saving ? "Salvando..." : "Registrar Pedido"}
              </button>
              <Link
                href="/pedidos"
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
