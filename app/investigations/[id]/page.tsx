"use client";

import { ArrowLeft, Check, ClipboardList, LoaderCircle, Save, Shield } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

type Investigation = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  unit: string;
  status: string;
  priority: string;
  access_level: string;
  opened_at: string;
  updated_at: string;
};

type TimelineEvent = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  created_at: string;
};

const statusLabels: Record<string, string> = { aberto: "Aberto", em_investigacao: "Em investigação", aguardando_diligencia: "Aguardando diligência", em_analise: "Em análise", concluido: "Concluído", arquivado: "Arquivado" };
const priorityLabels: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };

export default function InvestigationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Investigation | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [form, setForm] = useState({ title: "", description: "", unit: "", status: "aberto", priority: "media", access_level: "normal" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadCase() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFeedback({ type: "error", text: "Supabase não está configurado neste ambiente." });
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("investigations").select("id, identifier, title, description, unit, status, priority, access_level, opened_at, updated_at").eq("id", params.id).maybeSingle();
    if (error || !data) {
      setFeedback({ type: "error", text: "Inquérito não encontrado ou sem permissão de acesso." });
      setLoading(false);
      return;
    }
    setItem(data);
    setForm({ title: data.title, description: data.description || "", unit: data.unit, status: data.status, priority: data.priority, access_level: data.access_level });
    const { data: events } = await supabase.from("timeline_events").select("id, event_type, title, description, created_at").eq("investigation_id", params.id).order("created_at", { ascending: false });
    setTimeline(events || []);
    setLoading(false);
  }

  useEffect(() => { void loadCase(); }, [params.id]);

  async function saveCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !item) {
      setFeedback({ type: "error", text: "Não foi possível salvar o inquérito." });
      setSaving(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    const changedFields = Object.entries(form).filter(([key, value]) => value !== item[key as keyof Investigation]);
    const { data, error } = await supabase.from("investigations").update({
      title: form.title.trim(),
      description: form.description.trim() || null,
      unit: form.unit.trim(),
      status: form.status,
      priority: form.priority,
      access_level: form.access_level,
      updated_at: new Date().toISOString()
    }).eq("id", item.id).select("id, identifier, title, description, unit, status, priority, access_level, opened_at, updated_at").single();
    if (error) {
      setFeedback({ type: "error", text: "Não foi possível salvar as alterações." });
    } else {
      setItem(data);
      if (changedFields.length > 0) {
        await supabase.from("timeline_events").insert({
          investigation_id: item.id,
          event_type: "updated",
          title: "Dados do inquérito atualizados",
          description: `Campos alterados: ${changedFields.map(([key]) => key).join(", ")}.`,
          actor_id: user.id
        });
      }
      await loadCase();
      setFeedback({ type: "success", text: "Alterações salvas com sucesso." });
    }
    setSaving(false);
  }

  if (loading) return <main className="profile-loading"><LoaderCircle className="spin" size={22} /> Carregando inquérito...</main>;
  if (!item) return <main className="profile-loading"><p>{feedback?.text || "Inquérito indisponível."}</p><button className="secondary-button" onClick={() => router.push("/investigations")}>Voltar</button></main>;

  return (
    <main className="shell">
      <aside className="sidebar"><div className="brand"><div className="brand-mark"><Shield size={21} /></div><div><strong>MRP</strong><span>INTELLIGENCE</span></div></div><p className="nav-label">INVESTIGAÇÃO</p><button className="nav-item active"><ClipboardList size={18} /><span>Inquérito</span></button><button className="nav-item" onClick={() => router.push("/investigations")}><ArrowLeft size={18} /><span>Todos os inquéritos</span></button></aside>
      <section className="content"><header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><button className="breadcrumb-link" onClick={() => router.push("/investigations")}>Inquéritos</button><span>/</span><strong>{item.identifier}</strong></div></header>
        <div className="page investigation-detail-page"><div className="page-heading"><div><p className="eyebrow">{item.identifier}</p><h1>{item.title}</h1><p className="muted">Aberto em {new Date(item.opened_at).toLocaleString("pt-BR")}</p></div><button className="secondary-button" onClick={() => router.push("/investigations")}><ArrowLeft size={16} /> Voltar</button></div>
          <div className="detail-grid"><form className="panel detail-form" onSubmit={saveCase}><div className="panel-heading"><div><h2>Dados do inquérito</h2><p>Atualize o andamento e as informações principais.</p></div></div><div className="detail-fields"><label>Título ou objeto<input required minLength={3} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Unidade responsável<input required value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></label><label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="form-row"><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Prioridade<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div><label>Classificação de acesso<select value={form.access_level} onChange={(event) => setForm({ ...form, access_level: event.target.value })}><option value="normal">Normal</option><option value="restrito">Restrito</option><option value="sigiloso">Sigiloso</option><option value="alto_sigilo">Alto sigilo</option></select></label></div>{feedback && <p className={`profile-feedback ${feedback.type}`}>{feedback.type === "success" && <Check size={15} />}{feedback.text}</p>}<div className="profile-actions"><button className="primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={16} /> Salvando...</> : <><Save size={16} /> Salvar alterações</>}</button></div></form>
            <section className="panel timeline-panel"><div className="panel-heading"><div><h2>Linha do tempo</h2><p>Histórico cronológico do inquérito.</p></div></div><div className="detail-timeline">{timeline.length === 0 ? <div className="empty-state"><span>Nenhum evento registrado.</span></div> : timeline.map((event) => <div className="timeline-event" key={event.id}><span className="activity-dot purple-dot" /><div><strong>{event.title}</strong><p>{event.description}</p><small>{new Date(event.created_at).toLocaleString("pt-BR")}</small></div></div>)}</div></section>
          </div>
        </div>
      </section>
    </main>
  );
}
