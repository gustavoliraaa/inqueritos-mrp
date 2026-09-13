"use client";

import { ArrowLeft, ClipboardCheck, LoaderCircle, Plus, Search, Shield, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import AppSidebar from "../../components/app-sidebar";

type Investigation = { id: string; identifier: string; title: string };
type Profile = { id: string; full_name: string };
type TaskItem = {
  id: string;
  investigation_id: string | null;
  title: string;
  description: string | null;
  assignee: string | null;
  priority: string;
  status: string;
  due_at: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
  investigation?: Investigation | null;
  assignee_name?: string | null;
};

const emptyForm = {
  investigation_id: "",
  title: "",
  description: "",
  assignee_id: "",
  priority: "media",
  status: "pendente",
  due_at: "",
  result: ""
};

const priorityLabels: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  bloqueada: "Bloqueada"
};

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<TaskItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }

    const [{ data: taskData, error: taskError }, { data: investigationData, error: investigationError }, { data: profileData, error: profileError }] = await Promise.all([
      supabase.from("tasks").select("id, investigation_id, title, description, assignee, priority, status, due_at, result, created_at, updated_at").order("due_at", { ascending: true }),
      supabase.from("investigations").select("id, identifier, title").order("updated_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").order("full_name", { ascending: true })
    ]);

    if (taskError || investigationError || profileError) {
      setError("Não foi possível carregar as diligências.");
      setLoading(false);
      return;
    }

    const investigationMap = new Map((investigationData || []).map((item) => [item.id, item]));
    const profileMap = new Map((profileData || []).map((item) => [item.id, item.full_name]));

    const mappedTasks = (taskData || []).map((task) => ({
      ...task,
      investigation: task.investigation_id ? investigationMap.get(task.investigation_id) || null : null,
      assignee_name: task.assignee ? profileMap.get(task.assignee) || null : null
    })) as TaskItem[];

    setTasks(mappedTasks);
    setInvestigations(investigationData || []);
    setProfiles(profileData || []);
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(task: TaskItem) {
    setEditing(task);
    setForm({
      investigation_id: task.investigation_id || "",
      title: task.title,
      description: task.description || "",
      assignee_id: task.assignee || "",
      priority: task.priority,
      status: task.status,
      due_at: task.due_at ? task.due_at.slice(0, 10) : "",
      result: task.result || ""
    });
    setError("");
    setShowForm(true);
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      setSaving(false);
      return;
    }

    const payload = {
      investigation_id: form.investigation_id || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      assignee: form.assignee_id || null,
      priority: form.priority,
      status: form.status,
      due_at: form.due_at || null,
      result: form.result.trim() || null
    };

    let operationError = "";
    if (editing) {
      const { error: updateError } = await supabase.from("tasks").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editing.id);
      if (updateError) operationError = "Não foi possível salvar a diligência.";
    } else {
      const { error: insertError } = await supabase.from("tasks").insert({ ...payload, created_by: user.id });
      if (insertError) operationError = "Não foi possível registrar a diligência.";
    }

    if (operationError) {
      setError(operationError);
    } else {
      setShowForm(false);
      setLoading(true);
      await loadData();
    }
    setSaving(false);
  }

  const filtered = tasks.filter((task) => {
    const investigation = task.investigation;
    const assigneeName = task.assignee_name || "";
    return `${task.title} ${task.description || ""} ${investigation?.identifier || ""} ${investigation?.title || ""} ${assigneeName}`.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <main className="shell">
      <AppSidebar active="Diligências" />

      <section className="content">
        <header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><strong>Diligências</strong></div></header>
        <div className="page people-page">
          <div className="page-heading"><div><p className="eyebrow">GESTÃO OPERACIONAL</p><h1>Diligências</h1><p className="muted">Acompanhe pendências, ações e resultados atribuidos ao inquérito.</p></div><button className="primary-button" onClick={openCreate}><Plus size={18} /> Nova diligência</button></div>

          <section className="panel">
            <div className="investigations-toolbar"><label className="search"><Search size={17} /><input placeholder="Buscar por título, inquérito ou responsável..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{filtered.length} registro(s)</span></div>
            {error && !showForm && <p className="page-error">{error}</p>}
            {loading ? <div className="empty-state"><LoaderCircle className="spin" size={22} /> Carregando diligências...</div> : filtered.length === 0 ? <div className="empty-state"><ClipboardCheck size={28} /><strong>Nenhuma diligência encontrada</strong><span>Cadastre a primeira ação para manter o inquérito em movimento.</span></div> : <div className="table-wrap"><table><thead><tr><th>TÍTULO</th><th>INQUÉRITO</th><th>RESPONSÁVEL</th><th>PRIORIDADE</th><th>STATUS</th><th>PRAZO</th></tr></thead><tbody>{filtered.map((task) => <tr className="clickable-row" key={task.id} onClick={() => openEdit(task)}><td><strong>{task.title}</strong><small>{task.description || "Sem descrição"}</small></td><td>{task.investigation ? `${task.investigation.identifier} · ${task.investigation.title}` : "Não vinculado"}</td><td>{task.assignee_name || "Não atribuído"}</td><td><span className={`priority priority-${task.priority}`}><i />{priorityLabels[task.priority] || task.priority}</span></td><td><span className={`status status-${task.status}`}>{statusLabels[task.status] || task.status}</span></td><td>{task.due_at ? new Date(`${task.due_at}T00:00:00`).toLocaleDateString("pt-BR") : "Sem prazo"}</td></tr>)}</tbody></table></div>}
          </section>
        </div>
      </section>

      {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><form className="modal person-modal" onSubmit={saveTask} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button><p className="eyebrow">{editing ? editing.title : "NOVO REGISTRO"}</p><h2>{editing ? "Editar diligência" : "Registrar diligência"}</h2><label>Inquérito relacionado<select value={form.investigation_id} onChange={(event) => setForm({ ...form, investigation_id: event.target.value })}><option value="">Não vincular agora</option>{investigations.map((investigation) => <option key={investigation.id} value={investigation.id}>{investigation.identifier} · {investigation.title}</option>)}</select></label><label>Título<input required minLength={3} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label>Responsável<select value={form.assignee_id} onChange={(event) => setForm({ ...form, assignee_id: event.target.value })}><option value="">Não atribuído</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name}</option>)}</select></label><div className="form-row"><label>Prioridade<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="pendente">Pendente</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option><option value="bloqueada">Bloqueada</option></select></label></div><label>Prazo<input type="date" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} /></label><label>Resultado<textarea value={form.result} onChange={(event) => setForm({ ...form, result: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar diligência"}</button></div></form></div>}
    </main>
  );
}
