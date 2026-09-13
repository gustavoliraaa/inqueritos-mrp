"use client";

import { ArrowLeft, LoaderCircle, Plus, Search, Shield, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type Person = {
  id: string;
  identifier: string;
  name: string;
  document_id: string | null;
  aliases: string[];
  birth_date: string | null;
  notes: string | null;
  status: string;
  updated_at: string;
};

export default function PeoplePage() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [form, setForm] = useState({ name: "", document_id: "", aliases: "", birth_date: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadPeople() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase.from("people").select("id, identifier, name, document_id, aliases, birth_date, notes, status, updated_at").order("updated_at", { ascending: false });
    if (queryError) setError("Não foi possível carregar as pessoas.");
    else setPeople(data || []);
    setLoading(false);
  }

  useEffect(() => { void loadPeople(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", document_id: "", aliases: "", birth_date: "", notes: "" });
    setError("");
    setShowForm(true);
  }

  function openEdit(person: Person) {
    setEditing(person);
    setForm({ name: person.name, document_id: person.document_id || "", aliases: person.aliases.join(", "), birth_date: person.birth_date || "", notes: person.notes || "" });
    setError("");
    setShowForm(true);
  }

  async function savePerson(event: FormEvent<HTMLFormElement>) {
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
    const aliases = form.aliases.split(",").map((alias) => alias.trim()).filter(Boolean);
    let operationError = "";
    if (editing) {
      const { error: updateError } = await supabase.from("people").update({
        name: form.name.trim(),
        document_id: form.document_id.trim() || null,
        aliases,
        birth_date: form.birth_date || null,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString()
      }).eq("id", editing.id);
      if (updateError) {
        operationError = "Não foi possível salvar as alterações.";
        setError(operationError);
      }
    } else {
      const { data: identifier, error: identifierError } = await supabase.rpc("next_person_identifier");
      if (identifierError) {
        setError("Execute a migração de numeração de pessoas no Supabase antes de cadastrar.");
        setSaving(false);
        return;
      }
      const { error: insertError } = await supabase.from("people").insert({
        identifier,
        name: form.name.trim(),
        document_id: form.document_id.trim() || null,
        aliases,
        birth_date: form.birth_date || null,
        notes: form.notes.trim() || null,
        created_by: user.id
      });
      if (insertError) {
        operationError = "Não foi possível cadastrar a pessoa.";
        setError(operationError);
      }
    }
    if (!operationError) {
      setShowForm(false);
      setLoading(true);
      await loadPeople();
    }
    setSaving(false);
  }

  const filtered = people.filter((person) => `${person.identifier} ${person.name} ${person.document_id || ""} ${person.aliases.join(" ")}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="shell">
      <aside className="sidebar"><div className="brand"><div className="brand-mark"><Shield size={21} /></div><div><strong>MRP</strong><span>INTELLIGENCE</span></div></div><p className="nav-label">INTELIGÊNCIA</p><button className="nav-item active"><UserRound size={18} /><span>Pessoas</span></button><button className="nav-item" onClick={() => router.push("/")}><ArrowLeft size={18} /><span>Voltar para central</span></button></aside>
      <section className="content"><header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><strong>Pessoas</strong></div></header>
        <div className="page people-page"><div className="page-heading"><div><p className="eyebrow">CADASTRO CENTRAL</p><h1>Pessoas</h1><p className="muted">Cadastre personagens uma única vez e reutilize-os em investigações.</p></div><button className="primary-button" onClick={openCreate}><Plus size={18} /> Nova pessoa</button></div>
          <section className="panel"><div className="investigations-toolbar"><label className="search"><Search size={17} /><input placeholder="Buscar por nome, identificador ou documento..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{filtered.length} registro(s)</span></div>{error && !showForm && <p className="page-error">{error}</p>}{loading ? <div className="empty-state"><LoaderCircle className="spin" size={22} /> Carregando pessoas...</div> : filtered.length === 0 ? <div className="empty-state"><UserRound size={28} /><strong>Nenhuma pessoa encontrada</strong><span>Cadastre a primeira pessoa para formar a base de inteligência.</span></div> : <div className="table-wrap"><table><thead><tr><th>IDENTIFICADOR</th><th>NOME</th><th>DOCUMENTO</th><th>APELIDOS</th><th>ATUALIZADO</th></tr></thead><tbody>{filtered.map((person) => <tr className="clickable-row" key={person.id} onClick={() => openEdit(person)}><td><strong>{person.identifier}</strong></td><td><strong>{person.name}</strong><small>{person.status === "active" ? "Cadastro ativo" : "Cadastro inativo"}</small></td><td>{person.document_id || "Não informado"}</td><td>{person.aliases.length ? person.aliases.join(", ") : "Nenhum"}</td><td className="muted">{new Date(person.updated_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div>}</section>
        </div>
      </section>
      {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><form className="modal person-modal" onSubmit={savePerson} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button><p className="eyebrow">{editing ? editing.identifier : "NOVO CADASTRO"}</p><h2>{editing ? "Editar pessoa" : "Cadastrar pessoa"}</h2><label>Nome do personagem<input required minLength={2} autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Documento ou identificação fictícia<input value={form.document_id} onChange={(event) => setForm({ ...form, document_id: event.target.value })} /></label><label>Apelidos <span className="field-hint">(separe por vírgulas)</span><input value={form.aliases} onChange={(event) => setForm({ ...form, aliases: event.target.value })} /></label><label>Data de nascimento<input type="date" value={form.birth_date} onChange={(event) => setForm({ ...form, birth_date: event.target.value })} /></label><label>Observações<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar pessoa"}</button></div></form></div>}
    </main>
  );
}
