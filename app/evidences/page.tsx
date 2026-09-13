"use client";

import { Archive, ArrowLeft, FileUp, LoaderCircle, Plus, Search, Shield, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type Investigation = { id: string; identifier: string; title: string };
type Evidence = {
  id: string;
  identifier: string;
  investigation_id: string | null;
  evidence_type: string;
  title: string;
  description: string | null;
  storage_path: string | null;
  collected_at: string | null;
  collected_location: string | null;
  status: string;
  created_at: string;
  investigations: { identifier: string; title: string }[] | null;
};

const emptyForm = { identifier: "", investigation_id: "", evidence_type: "Documento", title: "", description: "", collected_at: "", collected_location: "", status: "active" };
const statusLabels: Record<string, string> = { active: "Ativa", analyzed: "Analisada", archived: "Arquivada" };

export default function EvidencesPage() {
  const router = useRouter();
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Evidence | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState("");

  async function loadData() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }
    const [{ data: evidenceData, error: evidenceError }, { data: investigationData, error: investigationError }] = await Promise.all([
      supabase.from("evidences").select("id, identifier, investigation_id, evidence_type, title, description, storage_path, collected_at, collected_location, status, created_at, investigations(identifier, title)").order("created_at", { ascending: false }),
      supabase.from("investigations").select("id, identifier, title").order("updated_at", { ascending: false })
    ]);
    if (evidenceError || investigationError) setError("Não foi possível carregar as evidências.");
    else {
      setEvidences((evidenceData || []) as Evidence[]);
      setInvestigations(investigationData || []);
    }
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setAttachment(null);
    setError("");
    setShowForm(true);
  }

  function openEdit(evidence: Evidence) {
    setEditing(evidence);
    setForm({
      identifier: evidence.identifier,
      investigation_id: evidence.investigation_id || "",
      evidence_type: evidence.evidence_type,
      title: evidence.title,
      description: evidence.description || "",
      collected_at: evidence.collected_at ? evidence.collected_at.slice(0, 10) : "",
      collected_location: evidence.collected_location || "",
      status: evidence.status
    });
    setAttachment(null);
    setError("");
    setShowForm(true);
  }

  async function openAttachment(evidence: Evidence) {
    if (!evidence.storage_path) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      return;
    }
    const { data, error: signedUrlError } = await supabase.storage.from("evidence-files").createSignedUrl(evidence.storage_path, 300);
    if (signedUrlError || !data?.signedUrl) {
      setError("Não foi possível abrir o anexo.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function saveEvidence(event: FormEvent<HTMLFormElement>) {
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
    if (attachment && attachment.size > 10 * 1024 * 1024) {
      setError("O anexo deve ter no máximo 10 MB.");
      setSaving(false);
      return;
    }
    const identifier = form.identifier.trim().toUpperCase();
    let operationError = "";
    let savedIdentifier = identifier;
    if (!editing && !identifier) {
      const { data, error: identifierError } = await supabase.rpc("next_evidence_identifier");
      if (identifierError || !data) {
        setError("Execute a migração de numeração de evidências no Supabase antes de cadastrar.");
        setSaving(false);
        return;
      }
      savedIdentifier = data;
    }
    const payload = {
      identifier: savedIdentifier,
      investigation_id: form.investigation_id || null,
      evidence_type: form.evidence_type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      collected_at: form.collected_at || null,
      collected_location: form.collected_location.trim() || null,
      status: form.status
    };
    let savedEvidenceId = editing?.id || "";
    if (editing) {
      const { error: updateError } = await supabase.from("evidences").update(payload).eq("id", editing.id);
      if (updateError) operationError = "Não foi possível salvar as alterações.";
    } else {
      const { data: inserted, error: insertError } = await supabase.from("evidences").insert({ ...payload, created_by: user.id }).select("id, identifier").single();
      if (insertError) operationError = "Não foi possível cadastrar a evidência. O identificador pode já existir.";
      if (!insertError && inserted) savedEvidenceId = inserted.id;
      if (!insertError && inserted && payload.investigation_id) {
        const { error: timelineError } = await supabase.from("timeline_events").insert({
          investigation_id: payload.investigation_id,
          event_type: "evidence_created",
          title: `Evidência ${inserted.identifier} registrada`,
          description: `${payload.title} foi adicionada ao inquérito.`,
          actor_id: user.id
        });
        if (timelineError) operationError = "A evidência foi criada, mas não foi possível registrar o evento na linha do tempo.";
      }
    }
    if (!operationError && attachment && savedEvidenceId) {
      const safeName = attachment.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
      const storagePath = `${user.id}/${savedEvidenceId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("evidence-files").upload(storagePath, attachment, { upsert: false });
      if (uploadError) {
        operationError = "O registro foi salvo, mas o anexo não pôde ser enviado.";
      } else {
        const { error: pathError } = await supabase.from("evidences").update({ storage_path: storagePath }).eq("id", savedEvidenceId);
        if (pathError) operationError = "O anexo foi enviado, mas não foi possível vinculá-lo à evidência.";
      }
    }
    if (operationError) setError(operationError);
    else {
      setShowForm(false);
      setLoading(true);
      await loadData();
    }

    setSaving(false);
  }

  const filtered = evidences.filter((evidence) => {
    const investigation = evidence.investigations?.[0];
    return `${evidence.identifier} ${evidence.title} ${evidence.evidence_type} ${investigation?.identifier || ""} ${investigation?.title || ""} ${evidence.collected_location || ""}`.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <main className="shell">
      <aside className="sidebar"><div className="brand"><div className="brand-mark"><Shield size={21} /></div><div><strong>MRP</strong><span>INTELLIGENCE</span></div></div><p className="nav-label">INVESTIGAÇÃO</p><button className="nav-item active"><Archive size={18} /><span>Evidências</span></button><button className="nav-item" onClick={() => router.push("/")}><ArrowLeft size={18} /><span>Voltar para central</span></button></aside>
      <section className="content"><header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><strong>Evidências</strong></div></header>
        <div className="page people-page"><div className="page-heading"><div><p className="eyebrow">GESTÃO PROBATÓRIA</p><h1>Evidências</h1><p className="muted">Registre materiais, documentos e objetos relacionados aos inquéritos.</p></div><button className="primary-button" onClick={openCreate}><Plus size={18} /> Nova evidência</button></div>
          <section className="panel"><div className="investigations-toolbar"><label className="search"><Search size={17} /><input placeholder="Buscar por identificador, título, tipo ou inquérito..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{filtered.length} registro(s)</span></div>{error && !showForm && <p className="page-error">{error}</p>}{loading ? <div className="empty-state"><LoaderCircle className="spin" size={22} /> Carregando evidências...</div> : filtered.length === 0 ? <div className="empty-state"><Archive size={28} /><strong>Nenhuma evidência encontrada</strong><span>Cadastre a primeira evidência para iniciar o controle probatório.</span></div> : <div className="table-wrap"><table><thead><tr><th>IDENTIFICADOR</th><th>TÍTULO</th><th>TIPO</th><th>INQUÉRITO</th><th>STATUS</th><th>ANEXO</th><th>COLETA</th></tr></thead><tbody>{filtered.map((evidence) => { const investigation = evidence.investigations?.[0]; return <tr className="clickable-row" key={evidence.id} onClick={() => openEdit(evidence)}><td><strong>{evidence.identifier}</strong></td><td><strong>{evidence.title}</strong><small>{evidence.description || "Sem descrição"}</small></td><td>{evidence.evidence_type}</td><td>{investigation ? `${investigation.identifier} · ${investigation.title}` : "Não vinculado"}</td><td><span className="status status-em-analise">{statusLabels[evidence.status] || evidence.status}</span></td><td>{evidence.storage_path ? <button className="text-button" onClick={(event) => { event.stopPropagation(); void openAttachment(evidence); }}>Abrir</button> : "Nenhum"}</td><td>{evidence.collected_at ? new Date(`${evidence.collected_at}T00:00:00`).toLocaleDateString("pt-BR") : "Não informada"}</td></tr>; })}</tbody></table></div>}</section>
        </div>
      </section>
      {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><form className="modal person-modal" onSubmit={saveEvidence} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button><p className="eyebrow">{editing ? editing.identifier : "NOVO REGISTRO"}</p><h2>{editing ? "Editar evidência" : "Cadastrar evidência"}</h2><label>Identificador fictício <span className="field-hint">(opcional)</span><input value={form.identifier} placeholder="Ex.: EVD-000001" onChange={(event) => setForm({ ...form, identifier: event.target.value })} /></label><label>Inquérito relacionado<select value={form.investigation_id} onChange={(event) => setForm({ ...form, investigation_id: event.target.value })}><option value="">Não vincular agora</option>{investigations.map((investigation) => <option key={investigation.id} value={investigation.id}>{investigation.identifier} · {investigation.title}</option>)}</select></label><label>Título<input required minLength={3} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Tipo<select value={form.evidence_type} onChange={(event) => setForm({ ...form, evidence_type: event.target.value })}><option>Documento</option><option>Imagem</option><option>Vídeo</option><option>Áudio</option><option>Objeto</option><option>Relatório</option><option>Outro</option></select></label><label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label>Data da coleta<input type="date" value={form.collected_at} onChange={(event) => setForm({ ...form, collected_at: event.target.value })} /></label><label>Local da coleta<input value={form.collected_location} onChange={(event) => setForm({ ...form, collected_location: event.target.value })} /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Ativa</option><option value="analyzed">Analisada</option><option value="archived">Arquivada</option></select></label><label>Anexo <span className="field-hint">(opcional, até 10 MB)</span><input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.mp3,.wav,.mp4" onChange={(event) => setAttachment(event.target.files?.[0] || null)} />{editing?.storage_path && <span className="field-hint">Já existe um anexo. Selecione outro para substituí-lo.</span>}</label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar evidência"}</button></div></form></div>}
    </main>
  );
}
