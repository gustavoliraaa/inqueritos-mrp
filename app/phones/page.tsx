"use client";

import { CircleHelp, Headphones, LoaderCircle, Phone, PhoneCall, Plus, Radio, Search, Smartphone, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import AppSidebar from "../../components/app-sidebar";

type PhoneRecord = {
  id: string;
  identifier: string;
  name: string;
  data: { number?: string; type?: string; owner?: string; person_id?: string; person_name?: string; carrier?: string; notes?: string };
  updated_at: string;
};

type PersonOption = { id: string; identifier: string; name: string };

const phoneTypes = [
  { value: "Celular", description: "Linha móvel", tone: "blue", icon: Smartphone },
  { value: "Fixo", description: "Telefone residencial", tone: "purple", icon: PhoneCall },
  { value: "Comercial", description: "Linha empresarial", tone: "green", icon: Headphones },
  { value: "Rádio", description: "Comunicação por rádio", tone: "amber", icon: Radio },
  { value: "Outro", description: "Outro tipo de linha", tone: "red", icon: CircleHelp }
] as const;

const emptyForm = { identifier: "", number: "", type: "Celular", person_id: "", owner: "", carrier: "", notes: "" };

export default function PhonesPage() {
  const router = useRouter();
  const [phones, setPhones] = useState<PhoneRecord[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
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
    const [phonesResult, peopleResult] = await Promise.all([
      supabase
        .from("entities")
        .select("id, identifier, name, data, updated_at")
        .eq("entity_type", "phone")
        .order("updated_at", { ascending: false }),
      supabase
        .from("people")
        .select("id, identifier, name")
        .eq("status", "active")
        .order("name", { ascending: true })
    ]);
    if (phonesResult.error) setError("Não foi possível carregar os telefones.");
    else setPhones((phonesResult.data || []) as PhoneRecord[]);
    if (peopleResult.error) setError("Não foi possível carregar as pessoas para o cadastro de telefones.");
    else setPeople(peopleResult.data || []);
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
      person_id: phone.data?.person_id || "",
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
    if (!editing && !form.person_id) {
      setError("Selecione uma pessoa cadastrada vinculada ao telefone.");
      setSaving(false);
      return;
    }
    const selectedPerson = people.find((person) => person.id === form.person_id);
    const data = {
      number,
      type: form.type,
      person_id: form.person_id || undefined,
      person_name: selectedPerson?.name,
      owner: selectedPerson?.name || form.owner.trim(),
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
    `${phone.identifier} ${phone.name} ${phone.data?.type || ""} ${phone.data?.person_name || phone.data?.owner || ""} ${phone.data?.carrier || ""}`
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
            <div className="investigations-toolbar"><label className="search"><Search size={17} /><input placeholder="Buscar por número, pessoa, tipo ou operadora..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{filtered.length} registro(s)</span></div>
            {error && !showForm && <p className="page-error">{error}</p>}
            {loading ? <div className="empty-state"><LoaderCircle className="spin" size={22} /> Carregando telefones...</div> : filtered.length === 0 ? <div className="empty-state"><Phone size={28} /><strong>Nenhum telefone encontrado</strong><span>Cadastre o primeiro telefone para ampliar a base investigativa.</span></div> : <div className="table-wrap"><table><thead><tr><th>IDENTIFICADOR</th><th>NÚMERO</th><th>TIPO</th><th>PESSOA VINCULADA</th><th>OPERADORA</th><th>ATUALIZADO</th></tr></thead><tbody>{filtered.map((phone) => <tr className="clickable-row" key={phone.id} onClick={() => openEdit(phone)}><td><strong>{phone.identifier}</strong></td><td><strong>{phone.data?.number || phone.name}</strong></td><td>{phone.data?.type || "Não informado"}</td><td>{phone.data?.person_name || phone.data?.owner || "Não informado"}</td><td>{phone.data?.carrier || "Não informada"}</td><td className="muted">{new Date(phone.updated_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div>}
          </section>
        </div>
      </section>
      {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><form className="modal person-modal" onSubmit={savePhone} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button><p className="eyebrow">{editing ? editing.identifier : "NOVO CADASTRO"}</p><h2>{editing ? "Editar telefone" : "Cadastrar telefone"}</h2><label>Identificador fictício <span className="field-hint">(opcional)</span><input value={form.identifier} placeholder="Ex.: TEL-000001" onChange={(event) => setForm({ ...form, identifier: event.target.value })} /></label><label>Número<input required minLength={3} value={form.number} placeholder="Ex.: (555) 010-2026" onChange={(event) => setForm({ ...form, number: event.target.value })} /></label><fieldset className="role-field"><legend>Tipo de telefone</legend><div className="role-selector" role="radiogroup" aria-label="Tipo de telefone">{phoneTypes.map((option) => { const Icon = option.icon; return <button className={`role-option ${option.tone} ${form.type === option.value ? "selected" : ""}`} key={option.value} type="button" role="radio" aria-checked={form.type === option.value} onClick={() => setForm({ ...form, type: option.value })}><span className="role-option-icon"><Icon size={15} /></span><span className="role-option-copy"><strong>{option.value}</strong><small>{option.description}</small></span><span className="role-option-check" aria-hidden="true">{form.type === option.value ? "✓" : ""}</span></button>; })}</div></fieldset><label className="person-selector-label"><span><UserRound size={14} /> Pessoa vinculada {editing ? "" : <b>*</b>}</span><select required={!editing} value={form.person_id} onChange={(event) => setForm({ ...form, person_id: event.target.value })}><option value="">Selecione uma pessoa cadastrada</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.identifier}</option>)}</select>{people.length === 0 && <small>Nenhuma pessoa cadastrada. Cadastre uma pessoa antes de criar o telefone.</small>}</label><label>Operadora<input value={form.carrier} onChange={(event) => setForm({ ...form, carrier: event.target.value })} /></label><label>Observações<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" disabled={saving || (!editing && people.length === 0)}>{saving ? "Salvando..." : "Salvar telefone"}</button></div></form></div>}
    </main>
  );
}
