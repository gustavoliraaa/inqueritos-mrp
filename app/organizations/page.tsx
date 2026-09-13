"use client";

import { Building2, LoaderCircle, Plus, Search, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import AppSidebar from "../../components/app-sidebar";

type Organization = {
  id: string;
  identifier: string;
  name: string;
  data: { type?: string; members?: string; locations?: string; person_id?: string; person_name?: string; notes?: string };
  updated_at: string;
};

type PersonOption = { id: string; identifier: string; name: string };

const emptyForm = { identifier: "", name: "", type: "Facção", members: "", locations: "", person_id: "", notes: "" };

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadOrganizations() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase.from("entities").select("id, identifier, name, data, updated_at").eq("entity_type", "organization").order("updated_at", { ascending: false });
    if (queryError) setError("Não foi possível carregar as organizações.");
    else setOrganizations((data || []) as Organization[]);
    const { data: peopleData, error: peopleError } = await supabase
      .from("people")
      .select("id, identifier, name")
      .eq("status", "active")
      .order("name", { ascending: true });
    if (peopleError) setError("Não foi possível carregar as pessoas para o cadastro de organizações.");
    else setPeople(peopleData || []);
    setLoading(false);
  }

  useEffect(() => { void loadOrganizations(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(organization: Organization) {
    setEditing(organization);
    setForm({
      identifier: organization.identifier,
      name: organization.name,
      type: organization.data?.type || "Facção",
      members: organization.data?.members || "",
      locations: organization.data?.locations || "",
      person_id: organization.data?.person_id || "",
      notes: organization.data?.notes || ""
    });
    setError("");
    setShowForm(true);
  }

  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
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
      return;
    }
    const identifier = form.identifier.trim().toUpperCase();
    if (!editing && !form.person_id) {
      setError("Selecione uma pessoa cadastrada vinculada à organização.");
      setSaving(false);
      return;
    }
    const selectedPerson = people.find((person) => person.id === form.person_id);
    const data = { type: form.type, members: form.members.trim(), locations: form.locations.trim(), person_id: form.person_id || undefined, person_name: selectedPerson?.name, notes: form.notes.trim() };
    let operationError = "";
    if (editing) {
      const { error: updateError } = await supabase.from("entities").update({ identifier, name: form.name.trim(), data, updated_at: new Date().toISOString() }).eq("id", editing.id);
      if (updateError) operationError = "Não foi possível salvar as alterações.";
    } else {
      const { error: insertError } = await supabase.from("entities").insert({ entity_type: "organization", identifier, name: form.name.trim(), data, created_by: user.id });
      if (insertError) operationError = "Não foi possível cadastrar. O identificador pode já existir.";
    }
    if (operationError) {
      setError(operationError);
    } else {
      setShowForm(false);
      setLoading(true);
      await loadOrganizations();
    }
    setSaving(false);
  }

  const filtered = organizations.filter((organization) => `${organization.identifier} ${organization.name} ${organization.data?.type || ""} ${organization.data?.members || ""} ${organization.data?.locations || ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="shell">
      <AppSidebar active="Organizações" />
      <section className="content"><header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><strong>Organizações</strong></div></header>
        <div className="page people-page"><div className="page-heading"><div><p className="eyebrow">CADASTRO COMPLEMENTAR</p><h1>Organizações</h1><p className="muted">Registre facções, grupos e organizações relacionadas ao universo do RP.</p></div><button className="primary-button" onClick={openCreate}><Plus size={18} /> Nova organização</button></div>
          <section className="panel"><div className="investigations-toolbar"><label className="search"><Search size={17} /><input placeholder="Buscar por nome, tipo, membro ou local..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{filtered.length} registro(s)</span></div>{error && !showForm && <p className="page-error">{error}</p>}{loading ? <div className="empty-state"><LoaderCircle className="spin" size={22} /> Carregando organizações...</div> : filtered.length === 0 ? <div className="empty-state"><Building2 size={28} /><strong>Nenhuma organização encontrada</strong><span>Cadastre a primeira organização para ampliar a inteligência.</span></div> : <div className="table-wrap"><table><thead><tr><th>IDENTIFICADOR</th><th>NOME</th><th>TIPO</th><th>MEMBROS CONHECIDOS</th><th>LOCAIS ASSOCIADOS</th><th>ATUALIZADO</th></tr></thead><tbody>{filtered.map((organization) => <tr className="clickable-row" key={organization.id} onClick={() => openEdit(organization)}><td><strong>{organization.identifier}</strong></td><td><strong>{organization.name}</strong></td><td>{organization.data?.type || "Não informado"}</td><td>{organization.data?.members || "Nenhum informado"}</td><td>{organization.data?.locations || "Nenhum informado"}</td><td className="muted">{new Date(organization.updated_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div>}</section>
        </div>
      </section>
      {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><form className="modal person-modal" onSubmit={saveOrganization} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button><p className="eyebrow">{editing ? editing.identifier : "NOVO CADASTRO"}</p><h2>{editing ? "Editar organização" : "Cadastrar organização"}</h2><label>Identificador fictício<input required minLength={2} value={form.identifier} placeholder="Ex.: ORG-001" onChange={(event) => setForm({ ...form, identifier: event.target.value })} /></label><label>Nome<input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Facção</option><option>Gangue</option><option>Empresa</option><option>Grupo</option><option>Outro</option></select></label><label className="person-selector-label"><span><UserRound size={14} /> Pessoa vinculada {editing ? "" : <b>*</b>}</span><select required={!editing} value={form.person_id} onChange={(event) => setForm({ ...form, person_id: event.target.value })}><option value="">Selecione uma pessoa cadastrada</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.identifier}</option>)}</select>{people.length === 0 && <small>Nenhuma pessoa cadastrada. Cadastre uma pessoa antes de criar a organização.</small>}</label><label>Membros conhecidos <span className="field-hint">(nomes separados por vírgula)</span><input value={form.members} onChange={(event) => setForm({ ...form, members: event.target.value })} /></label><label>Locais associados<input value={form.locations} onChange={(event) => setForm({ ...form, locations: event.target.value })} /></label><label>Observações<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" disabled={saving || (!editing && people.length === 0)}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar organização"}</button></div></form></div>}
    </main>
  );
}
