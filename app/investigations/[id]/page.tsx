"use client";

import { ArrowLeft, Check, ClipboardList, FileDown, LoaderCircle, Save, Share2, Shield } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabase";
import AppSidebar from "../../../components/app-sidebar";

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

type Person = { id: string; identifier: string; name: string };
type LinkedPerson = Person & { role: string; notes: string | null };

const statusLabels: Record<string, string> = { aberto: "Aberto", em_investigacao: "Em investigação", aguardando_diligencia: "Aguardando diligência", em_analise: "Em análise", concluido: "Concluído", arquivado: "Arquivado" };
const priorityLabels: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const personRoleLabels: Record<string, string> = { investigado: "Investigado", vitima: "Vítima", testemunha: "Testemunha", citado: "Citado", outro: "Outro" };

export default function InvestigationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Investigation | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [linkedPeople, setLinkedPeople] = useState<LinkedPerson[]>([]);
  const [personForm, setPersonForm] = useState({ personId: "", role: "investigado", notes: "" });
  const [linkingPerson, setLinkingPerson] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", unit: "", status: "aberto", priority: "media", access_level: "normal" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sharing, setSharing] = useState(false);

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
    const { data: availablePeople } = await supabase.from("people").select("id, identifier, name").eq("status", "active").order("name");
    setPeople(availablePeople || []);
    const { data: links } = await supabase.from("investigation_people").select("person_id, role, notes, people(id, identifier, name)").eq("investigation_id", params.id);
    setLinkedPeople((links || []).flatMap((link) => {
      const person = Array.isArray(link.people) ? link.people[0] : link.people;
      return person ? [{ ...person, role: link.role, notes: link.notes }] : [];
    }));
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

  async function linkPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!personForm.personId) return;
    setLinkingPerson(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !item) {
      setFeedback({ type: "error", text: "Não foi possível vincular a pessoa." });
      setLinkingPerson(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    const selectedPerson = people.find((person) => person.id === personForm.personId);
    const { error } = await supabase.from("investigation_people").insert({
      investigation_id: item.id,
      person_id: personForm.personId,
      role: personForm.role,
      notes: personForm.notes.trim() || null,
      created_by: user.id
    });
    if (error) {
      setFeedback({ type: "error", text: error.code === "23505" ? "Essa pessoa já possui esse papel neste inquérito." : "Não foi possível criar o vínculo." });
    } else {
      const { error: timelineError } = await supabase.from("timeline_events").insert({
        investigation_id: item.id,
        event_type: "person_linked",
        title: `${selectedPerson?.name || "Pessoa"} vinculada ao inquérito`,
        description: `${selectedPerson?.identifier || "Cadastro"} adicionada como ${personRoleLabels[personForm.role] || personForm.role}${personForm.notes.trim() ? `. Contexto: ${personForm.notes.trim()}` : "."}`,
        actor_id: user.id
      });
      if (timelineError) {
        setFeedback({ type: "error", text: "A pessoa foi vinculada, mas o evento não pôde ser registrado na linha do tempo." });
      } else {
        setFeedback({ type: "success", text: "Pessoa vinculada ao inquérito." });
      }
      setPersonForm({ personId: "", role: "investigado", notes: "" });
      await loadCase();
    }
    setLinkingPerson(false);
  }

  async function unlinkPerson(personId: string, role: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !item) return;
    const linkedPerson = linkedPeople.find((person) => person.id === personId && person.role === role);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    const { error } = await supabase.from("investigation_people").delete().eq("investigation_id", item.id).eq("person_id", personId).eq("role", role);
    if (error) {
      setFeedback({ type: "error", text: "Não foi possível remover o vínculo." });
    } else {
      const { error: timelineError } = await supabase.from("timeline_events").insert({
        investigation_id: item.id,
        event_type: "person_unlinked",
        title: `${linkedPerson?.name || "Pessoa"} removida do inquérito`,
        description: `${linkedPerson?.identifier || "Cadastro"} deixou de exercer o papel de ${personRoleLabels[role] || role}.`,
        actor_id: user.id
      });
      setFeedback(timelineError
        ? { type: "error", text: "O vínculo foi removido, mas o evento não pôde ser registrado na linha do tempo." }
        : { type: "success", text: "Vínculo removido e registrado na linha do tempo." });
      await loadCase();
    }
  }

  async function shareInvestigation() {
    if (!item) return;
    setSharing(true);
    setFeedback(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFeedback({ type: "error", text: "Supabase não está configurado neste ambiente." });
      setSharing(false);
      return;
    }
    const { data: token, error } = await supabase.rpc("create_investigation_share", { target_investigation_id: item.id });
    if (error || !token) {
      const details = error?.message ? ` Detalhes: ${error.message}` : "";
      setFeedback({ type: "error", text: `Não foi possível gerar o link público. Execute novamente a migração de compartilhamento no Supabase.${details}` });
    } else {
      const url = `${window.location.origin}/public/investigations/${token}`;
      try {
        await navigator.clipboard.writeText(url);
        setFeedback({ type: "success", text: "Link público criado e copiado para a área de transferência." });
      } catch {
        setFeedback({ type: "success", text: `Link público criado: ${url}` });
      }
    }
    setSharing(false);
  }

  if (loading) return <main className="profile-loading"><LoaderCircle className="spin" size={22} /> Carregando inquérito...</main>;
  if (!item) return <main className="profile-loading"><p>{feedback?.text || "Inquérito indisponível."}</p><button className="secondary-button" onClick={() => router.push("/investigations")}>Voltar</button></main>;

  return (
    <main className="shell">
      <AppSidebar active="Inquéritos" />
      <section className="content"><header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><button className="breadcrumb-link" onClick={() => router.push("/investigations")}>Inquéritos</button><span>/</span><strong>{item.identifier}</strong></div></header>
        <div className="page investigation-detail-page"><div className="page-heading"><div><p className="eyebrow">{item.identifier}</p><h1>{item.title}</h1><p className="muted">Aberto em {new Date(item.opened_at).toLocaleString("pt-BR")}</p></div><div className="investigation-actions"><button className="secondary-button" onClick={() => router.push(`/investigations/${item.id}/report`)}><FileDown size={16} /> Ver relatório</button><button className="secondary-button" onClick={() => void shareInvestigation()} disabled={sharing}><Share2 size={16} /> {sharing ? "Gerando..." : "Compartilhar link"}</button><button className="secondary-button" onClick={() => router.push("/investigations")}><ArrowLeft size={16} /> Voltar</button></div></div>
          <div className="detail-grid"><form className="panel detail-form" onSubmit={saveCase}><div className="panel-heading"><div><h2>Dados do inquérito</h2><p>Atualize o andamento e as informações principais.</p></div></div><div className="detail-fields"><label>Título ou objeto<input required minLength={3} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Unidade responsável<input required value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></label><label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="form-row"><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Prioridade<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div><label>Classificação de acesso<select value={form.access_level} onChange={(event) => setForm({ ...form, access_level: event.target.value })}><option value="normal">Normal</option><option value="restrito">Restrito</option><option value="sigiloso">Sigiloso</option><option value="alto_sigilo">Alto sigilo</option></select></label></div>{feedback && <p className={`profile-feedback ${feedback.type}`}>{feedback.type === "success" && <Check size={15} />}{feedback.text}</p>}<div className="profile-actions"><button className="primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={16} /> Salvando...</> : <><Save size={16} /> Salvar alterações</>}</button></div></form>
            <section className="panel timeline-panel"><div className="panel-heading"><div><h2>Linha do tempo</h2><p>Histórico cronológico do inquérito.</p></div></div><div className="detail-timeline">{timeline.length === 0 ? <div className="empty-state"><span>Nenhum evento registrado.</span></div> : timeline.map((event) => <div className="timeline-event" key={event.id}><span className="activity-dot purple-dot" /><div><strong>{event.title}</strong><p>{event.description}</p><small>{new Date(event.created_at).toLocaleString("pt-BR")}</small></div></div>)}</div></section>
          </div>
          <section className="panel linked-people-panel"><div className="panel-heading"><div><h2>Pessoas vinculadas</h2><p>Defina o papel de cada pessoa neste inquérito.</p></div></div><form className="link-person-form" onSubmit={linkPerson}><select required value={personForm.personId} onChange={(event) => setPersonForm({ ...personForm, personId: event.target.value })}><option value="">Selecionar pessoa...</option>{people.filter((person) => !linkedPeople.some((link) => link.id === person.id && link.role === personForm.role)).map((person) => <option value={person.id} key={person.id}>{person.identifier} · {person.name}</option>)}</select><select value={personForm.role} onChange={(event) => setPersonForm({ ...personForm, role: event.target.value })}>{Object.entries(personRoleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><input placeholder="Contexto ou observação (opcional)" value={personForm.notes} onChange={(event) => setPersonForm({ ...personForm, notes: event.target.value })} /><button className="primary-button" disabled={linkingPerson}>{linkingPerson ? "Vinculando..." : "Vincular pessoa"}</button></form><div className="linked-people-list">{linkedPeople.length === 0 ? <div className="empty-state"><span>Nenhuma pessoa vinculada.</span></div> : linkedPeople.map((person) => <div className="linked-person" key={`${person.id}-${person.role}`}><div className="avatar avatar-small">{person.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div><div><strong>{person.name}</strong><span>{person.identifier} · {personRoleLabels[person.role] || person.role}</span>{person.notes && <small>{person.notes}</small>}</div><button type="button" className="remove-link" onClick={() => void unlinkPerson(person.id, person.role)}>Remover</button></div>)}</div></section>
        </div>
      </section>
    </main>
  );
}
