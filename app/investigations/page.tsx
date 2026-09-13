"use client";

import { ArrowLeft, ClipboardList, LoaderCircle, Plus, Search, Shield, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type Investigation = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  unit: string;
  status: string;
  priority: string;
  access_level: string;
  updated_at: string;
};

const statusLabels: Record<string, string> = {
  aberto: "Aberto",
  em_investigacao: "Em investigação",
  aguardando_diligencia: "Aguardando diligência",
  em_analise: "Em análise",
  concluido: "Concluído",
  arquivado: "Arquivado"
};

const priorityLabels: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };

export default function InvestigationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Investigation[]>([]);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", unit: "", priority: "media", access_level: "normal" });

  async function loadInvestigations() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("investigations")
      .select("id, identifier, title, description, unit, status, priority, access_level, updated_at")
      .order("updated_at", { ascending: false });

    if (queryError) setError("Não foi possível carregar os inquéritos.");
    else setItems(data || []);
    setLoading(false);
  }

  useEffect(() => {
    void loadInvestigations();
  }, []);

  async function createInvestigation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      return;
    }

    const { data: identifier, error: identifierError } = await supabase.rpc("next_investigation_identifier");
    if (identifierError) {
      setError("Execute a migração de numeração no Supabase antes de criar inquéritos.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("investigations").insert({
      identifier,
      title: form.title.trim(),
      description: form.description.trim() || null,
      unit: form.unit.trim(),
      priority: form.priority,
      access_level: form.access_level,
      created_by: user.id,
      responsible_delegate: user.id
    });

    if (insertError) {
      setError("Não foi possível criar o inquérito. Confira se seu perfil possui uma unidade.");
    } else {
      setForm({ title: "", description: "", unit: "", priority: "media", access_level: "normal" });
      setShowCreate(false);
      setLoading(true);
      await loadInvestigations();
    }
    setSaving(false);
  }

  const filtered = items.filter((item) => `${item.identifier} ${item.title} ${item.unit}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Shield size={21} /></div><div><strong>MRP</strong><span>INTELLIGENCE</span></div></div>
        <p className="nav-label">INVESTIGAÇÃO</p>
        <button className="nav-item active"><ClipboardList size={18} /><span>Inquéritos</span></button>
        <button className="nav-item" onClick={() => router.push("/")}><ArrowLeft size={18} /><span>Voltar para central</span></button>
      </aside>
      <section className="content">
        <header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><strong>Inquéritos</strong></div></header>
        <div className="page investigations-page">
          <div className="page-heading"><div><p className="eyebrow">GESTÃO OPERACIONAL</p><h1>Inquéritos</h1><p className="muted">Acompanhe e abra investigações da sua unidade.</p></div><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={18} /> Novo inquérito</button></div>
          <section className="panel">
            <div className="investigations-toolbar"><label className="search"><Search size={17} /><input placeholder="Buscar por número, título ou unidade..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{filtered.length} registro(s)</span></div>
            {error && <p className="page-error">{error}</p>}
            {loading ? <div className="empty-state"><LoaderCircle className="spin" size={22} /> Carregando inquéritos...</div> : filtered.length === 0 ? <div className="empty-state"><ClipboardList size={28} /><strong>Nenhum inquérito encontrado</strong><span>Abra o primeiro inquérito para começar a registrar a investigação.</span></div> : <div className="table-wrap"><table><thead><tr><th>IDENTIFICADOR</th><th>OBJETO</th><th>UNIDADE</th><th>STATUS</th><th>PRIORIDADE</th><th>ATUALIZADO</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><strong>{item.identifier}</strong></td><td><strong>{item.title}</strong><small>{item.description || "Sem descrição inicial"}</small></td><td>{item.unit}</td><td><span className={`status status-${item.status}`}>{statusLabels[item.status] || item.status}</span></td><td><span className={`priority priority-${item.priority}`}><i />{priorityLabels[item.priority] || item.priority}</span></td><td className="muted">{new Date(item.updated_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div>}
          </section>
        </div>
      </section>
      {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><form className="modal investigation-modal" onSubmit={createInvestigation} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowCreate(false)}><X size={18} /></button><p className="eyebrow">NOVO REGISTRO</p><h2>Abrir inquérito</h2><label>Título ou objeto<input required minLength={3} autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Unidade responsável<input required placeholder="Ex.: Unidade Central" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></label><label>Descrição inicial<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="form-row"><label>Prioridade<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label><label>Classificação<select value={form.access_level} onChange={(event) => setForm({ ...form, access_level: event.target.value })}><option value="normal">Normal</option><option value="restrito">Restrito</option><option value="sigiloso">Sigiloso</option><option value="alto_sigilo">Alto sigilo</option></select></label></div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Criando..." : "Criar inquérito"}</button></div></form></div>}
    </main>
  );
}
