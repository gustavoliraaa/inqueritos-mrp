"use client";

import { ArrowLeft, LoaderCircle, Phone, Plus, Search, Shield, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import AppSidebar from "../../components/app-sidebar";

type PhoneRecord = {
  id: string;
  identifier: string;
  name: string;
  data: { number?: string; type?: string; owner?: string; carrier?: string; notes?: string };
  updated_at: string;
};

const emptyForm = { identifier: "", number: "", type: "Celular", owner: "", carrier: "", notes: "" };

export default function PhonesPage() {
  const router = useRouter();
  const [phones, setPhones] = useState<PhoneRecord[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<PhoneRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadPhones() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase
      .from("entities")
      .select("id, identifier, name, data, updated_at")
      .eq("entity_type", "phone")
      .order("updated_at", { ascending: false });
    if (queryError) setError("Não foi possível carregar os telefones.");
    else setPhones((data || []) as PhoneRecord[]);
    setLoading(false);
  }

  useEffect(() => { void loadPhones(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(phone: PhoneRecord) {
    setEditing(phone);
    setForm({
      identifier: phone.identifier,
      number: phone.data?.number || phone.name,
      type: phone.data?.type || "Celular",
      owner: phone.data?.owner || "",
      carrier: phone.data?.carrier || "",
      notes: phone.data?.notes || ""
    });
    setError("");
    setShowForm(true);
  }

  async function savePhone(event: FormEvent<HTMLFormElement>) {
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
    const number = form.number.trim();
    const identifier = form.identifier.trim().toUpperCase();
    const data = {
      number,
      type: form.type,
      owner: form.owner.trim(),
      carrier: form.carrier.trim(),
      notes: form.notes.trim()
    };
    let operationError = "";
    if (editing) {
      const { error: updateError } = await supabase.from("entities").update({
        identifier,
        name: number,
        data,
        updated_at: new Date().toISOString()
      }).eq("id", editing.id);
      if (updateError) operationError = "Não foi possível salvar as alterações.";
    } else {
      const { data: generatedIdentifier, error: identifierError } = identifier
        ? { data: identifier, error: null }
        : await supabase.rpc("next_phone_identifier");
      if (identifierError || !generatedIdentifier) {
        setError("Não foi possível gerar o identificador do telefone.");
        setSaving(false);
        return;
      }
      const { error: insertError } = await supabase.from("entities").insert({
        entity_type: "phone",
        identifier: generatedIdentifier,
        name: number,
        data,
        created_by: user.id
      });
      if (insertError) operationError = "Não foi possível cadastrar o telefone. O identificador pode já existir.";
    }
    if (operationError) {
      setError(operationError);
    } else {
      setShowForm(false);
      setLoading(true);
      await loadPhones();
    }
    setSaving(false);
  }

  const filtered = phones.filter((phone) =>
    `${phone.identifier} ${phone.name} ${phone.data?.type || ""} ${phone.data?.owner || ""} ${phone.data?.carrier || ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <main className="shell">
      <AppSidebar active="Telefones" />
      <section className="content">
        <header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><strong>Telefones</strong></div></header>
        <div className="page people-page">
          <div className="page-heading"><div><p className="eyebrow">CADASTRO COMPLEMENTAR</p><h1>Telefones</h1><p className="muted">Registre linhas telefônicas e seus possíveis proprietários.</p></div><button className="primary-button" onClick={openCreate}><Plus size={18} /> Novo telefone</button></div>
          <section className="panel">
            <div className="investigations-toolbar"><label className="search"><Search size={17} /><input placeholder="Buscar por número, proprietário, tipo ou operadora..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{filtered.length} registro(s)</span></div>
            {error && !showForm && <p className="page-error">{error}</p>}
            {loading ? <div className="empty-state"><LoaderCircle className="spin" size={22} /> Carregando telefones...</div> : filtered.length === 0 ? <div className="empty-state"><Phone size={28} /><strong>Nenhum telefone encontrado</strong><span>Cadastre o primeiro telefone para ampliar a base investigativa.</span></div> : <div className="table-wrap"><table><thead><tr><th>IDENTIFICADOR</th><th>NÚMERO</th><th>TIPO</th><th>PROPRIETÁRIO</th><th>OPERADORA</th><th>ATUALIZADO</th></tr></thead><tbody>{filtered.map((phone) => <tr className="clickable-row" key={phone.id} onClick={() => openEdit(phone)}><td><strong>{phone.identifier}</strong></td><td><strong>{phone.data?.number || phone.name}</strong></td><td>{phone.data?.type || "Não informado"}</td><td>{phone.data?.owner || "Desconhecido"}</td><td>{phone.data?.carrier || "Não informada"}</td><td className="muted">{new Date(phone.updated_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div>}
          </section>
        </div>
      </section>
      {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><form className="modal person-modal" onSubmit={savePhone} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button><p className="eyebrow">{editing ? editing.identifier : "NOVO CADASTRO"}</p><h2>{editing ? "Editar telefone" : "Cadastrar telefone"}</h2><label>Identificador fictício <span className="field-hint">(opcional)</span><input value={form.identifier} placeholder="Ex.: TEL-000001" onChange={(event) => setForm({ ...form, identifier: event.target.value })} /></label><label>Número<input required minLength={3} value={form.number} placeholder="Ex.: (555) 010-2026" onChange={(event) => setForm({ ...form, number: event.target.value })} /></label><label>Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Celular</option><option>Fixo</option><option>Comercial</option><option>Rádio</option><option>Outro</option></select></label><label>Proprietário conhecido<input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></label><label>Operadora<input value={form.carrier} onChange={(event) => setForm({ ...form, carrier: event.target.value })} /></label><label>Observações<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar telefone"}</button></div></form></div>}
    </main>
  );
}
