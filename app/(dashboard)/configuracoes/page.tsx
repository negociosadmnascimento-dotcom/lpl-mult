"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Settings, Moon, Sun, Plus, Trash2, Save, Tag, Bell, Database, Info } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useTheme } from "@/components/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { formatDateTime, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Campanha } from "@/lib/types";

type CampanhaForm = { nome: string; descricao: string; data_inicio: string; data_fim: string };

export default function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme();
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [showCampanhaForm, setShowCampanhaForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dbStats, setDbStats] = useState({ brindes: 0, pedidos: 0, entradas: 0, notificacoes: 0 });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CampanhaForm>();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [campRes, brindRes, pedRes, entradRes, notifRes] = await Promise.all([
      supabase.from("campanhas").select("*").order("created_at", { ascending: false }),
      supabase.from("brindes").select("id", { count: "exact" }),
      supabase.from("pedidos").select("id", { count: "exact" }),
      supabase.from("entradas_estoque").select("id", { count: "exact" }),
      supabase.from("notificacoes").select("id", { count: "exact" }),
    ]);
    setCampanhas(campRes.data || []);
    setDbStats({
      brindes: brindRes.count || 0,
      pedidos: pedRes.count || 0,
      entradas: entradRes.count || 0,
      notificacoes: notifRes.count || 0,
    });
  }

  async function onSubmitCampanha(data: CampanhaForm) {
    setSaving(true);
    const { error } = await supabase.from("campanhas").insert({ ...data, ativa: true });
    setSaving(false);
    if (error) {
      toast.error("Erro ao criar campanha");
    } else {
      toast.success("Campanha criada!");
      reset();
      setShowCampanhaForm(false);
      loadData();
    }
  }

  async function toggleCampanha(camp: Campanha) {
    await supabase.from("campanhas").update({ ativa: !camp.ativa }).eq("id", camp.id);
    loadData();
  }

  async function deleteCampanha(id: string) {
    if (!confirm("Excluir esta campanha?")) return;
    await supabase.from("campanhas").delete().eq("id", id);
    toast.success("Campanha excluída");
    loadData();
  }

  async function clearNotificacoes() {
    if (!confirm("Limpar todas as notificações?")) return;
    await supabase.from("notificacoes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    toast.success("Notificações limpas");
    loadData();
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Configurações" subtitle="Personalize o sistema LPL mult" />
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">

        {/* Aparência */}
        <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-brand-blue/10 rounded-xl">
              <Settings size={18} className="text-brand-blue" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Aparência</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Personalize a interface do sistema</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Moon size={20} className="text-brand-blue" /> : <Sun size={20} className="text-yellow-500" />}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Tema do Sistema</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Alterne entre modo claro e escuro</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme("light")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  theme === "light"
                    ? "bg-white dark:bg-white text-gray-900 shadow-md border border-gray-200"
                    : "text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5"
                )}
              >
                <Sun size={14} /> Claro
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  theme === "dark"
                    ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                )}
              >
                <Moon size={14} /> Escuro
              </button>
            </div>
          </div>
        </div>

        {/* Campanhas */}
        <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
                <Tag size={18} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Campanhas Promocionais</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Gerencie as campanhas vinculadas aos pedidos</p>
              </div>
            </div>
            <button
              onClick={() => setShowCampanhaForm(!showCampanhaForm)}
              className="flex items-center gap-1.5 text-xs bg-purple-100 dark:bg-purple-900/20 hover:bg-purple-200 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-400 px-3 py-1.5 rounded-xl font-medium transition-colors"
            >
              <Plus size={13} />
              Nova Campanha
            </button>
          </div>

          {showCampanhaForm && (
            <form onSubmit={handleSubmit(onSubmitCampanha)} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl mb-5 animate-fade-in-up">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Nome da Campanha *</label>
                <input
                  {...register("nome", { required: "Campo obrigatório" })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-900 dark:text-gray-100"
                  placeholder="Ex: Campanha Verão 2025"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Descrição</label>
                <input
                  {...register("descricao")}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data Início</label>
                <input type="date" {...register("data_inicio")} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-900 dark:text-gray-100" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data Fim</label>
                <input type="date" {...register("data_fim")} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0d2e] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-900 dark:text-gray-100" />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" disabled={saving} className="btn-premium flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-purple-600/20 disabled:opacity-70">
                  {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={13} />}
                  Criar Campanha
                </button>
                <button type="button" onClick={() => { reset(); setShowCampanhaForm(false); }} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {campanhas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma campanha cadastrada</p>
          ) : (
            <div className="space-y-2">
              {campanhas.map((camp) => (
                <div key={camp.id} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/3 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", camp.ativa ? "bg-green-400" : "bg-gray-300")} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{camp.nome}</p>
                      {camp.descricao && <p className="text-xs text-gray-500 dark:text-gray-400">{camp.descricao}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCampanha(camp)}
                      className={cn(
                        "text-xs px-3 py-1 rounded-lg font-medium transition-colors",
                        camp.ativa
                          ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200"
                          : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200"
                      )}
                    >
                      {camp.ativa ? "Ativa" : "Inativa"}
                    </button>
                    <button
                      onClick={() => deleteCampanha(camp.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-brand-red hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notificações */}
        <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-xl">
                <Bell size={18} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Notificações</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Gerencie as notificações do sistema</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{dbStats.notificacoes} notificações no sistema</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Histórico de todas as notificações geradas</p>
            </div>
            <button
              onClick={clearNotificacoes}
              className="flex items-center gap-1.5 text-xs text-brand-red hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-xl font-medium transition-colors border border-red-200 dark:border-red-800/30"
            >
              <Trash2 size={12} />
              Limpar tudo
            </button>
          </div>
        </div>

        {/* Banco de Dados */}
        <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl">
              <Database size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Banco de Dados</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Estatísticas do banco de dados Supabase</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Brindes", value: dbStats.brindes, color: "text-brand-blue" },
              { label: "Pedidos", value: dbStats.pedidos, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Entradas", value: dbStats.entradas, color: "text-purple-600 dark:text-purple-400" },
              { label: "Notificações", value: dbStats.notificacoes, color: "text-orange-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-4 bg-gray-50 dark:bg-white/3 rounded-xl text-center">
                <p className={cn("text-2xl font-bold", color)}>{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-white dark:bg-[#0d0d2e] border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-blue rounded-full flex items-center justify-center border-2 border-brand-red shadow-md shadow-brand-blue/30 flex-shrink-0">
              <div className="text-center">
                <div className="text-white font-black text-sm leading-none">LPL</div>
                <div className="text-white/80 font-medium text-[8px]">mult</div>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">LPL mult - Gestão de Brindes</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Versão 1.0.0 • Sistema corporativo compartilhado</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Powered by Next.js + Supabase</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
