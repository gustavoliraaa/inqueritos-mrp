"use client";

import { ArrowLeft, Home, LoaderCircle, Plus, Search, Shield, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type Location = {
  id: string;
  identifier: string;
  name: string;
  data: { type?: string; address?: string; neighborhood?: string; owner?: string; notes?: string };
  updated_at: string;
};

const emptyForm = { identifier: "", name: "", type: "Residência", address: "", neighborhood: "", owner: "", notes: "" };

export default function LocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Location | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadLocations() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase
      .from("entities")
      .select("id, identifier, name, data, updated_at")
      .eq("entity_type", "location")
      .order("updated_at", { ascending: false });
    if (queryError) setError("Não foi possível carregar os locais.");
    else setLocations((data || []) as Location[]);
    setLoading(false);
  }

  useEffect(() => { void loadLocations(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(location: Location) {
    setEditing(location);
    setForm({
      identifier: location.identifier,
      name: location.name,
      type: location.data?.type || "Residência",
      address: location.data?.address || "",
      neighborhood: location.data?.neighborhood || "",
      owner: location.data?.owner || "",
      notes: location.data?.notes || ""
    });
    setError("");
    setShowForm(true);
  }

  async function saveLocation(event: FormEvent<HTMLFormElement>) {
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
    const name = form.name.trim();
    const identifier = form.identifier.trim().toUpperCase();
    const data = {
      type: form.type,
      address: form.address.trim(),
      neighborhood: form.neighborhood.trim(),
      owner: form.owner.trim(),
      notes: form.notes.trim()
    };
    let operationError = "";
    if (editing) {
      const { error: updateError } = await supabase.from("entities").update({
        identifier,
        name,
        data,
        updated_at: new Date().toISOString()
      }).eq("id", editing.id);
      if (updateError) operationError = "Não foi possível salvar as alterações.";
    } else {
      const { data: generatedIdentifier, error: identifierError } = identifier
        ? { data: identifier, error: null }
        : await supabase.rpc("next_location_identifier");
      if (identifierError || !generatedIdentifier) {
        setError("Não foi possível gerar o identificador do local.");
        setSaving(false);
        return;
      }
      const { error: insertError } = await supabase.from("entities").insert({
        entity_type: "location",
        identifier: generatedIdentifier,
        name,
        data,
        created_by: user.id
      });
      if (insertError) operationError = "Não foi possível cadastrar o local. O identificador pode já existir.";
    }
    if (operationError) {
      setError(operationError);
    } else {
      setShowForm(false);
      setLoading(true);
      await loadLocations();
    }
    setSaving(false);
  }

  const filtered = locations.filter((location) =>
    `${location.identifier} ${location.name} ${location.data?.type || ""} ${location.data?.address || ""} ${location.data?.neighborhood || ""} ${location.data?.owner || ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Shield size={21} /></div><div><strong>MRP</strong><span>INTELLIGENCE</span></div></div>
        <p className="nav-label">INTELIGÊNCIA</p>
        <button className="nav-item active"><Home size={18} /><span>Locais</span></button>
        <button className="nav-item" onClick={() => router.push("/")}><ArrowLeft size={18} /><span>Voltar para central</span></button>
      </aside>
      <section className="content">
        <header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><strong>Locais</strong></div></header>
        <div className="page people-page">
          <div className="page-heading"><div><p className="eyebrow">CADASTRO COMPLEMENTAR</p><h1>Locais e imóveis</h1><p className="muted">Cadastre endereços, imóveis e pontos relevantes para as investigações.</p></div><button className="primary-button" onClick={openCreate}><Plus size={18} /> Novo local</button></div>
          <section className="panel">
            <div className="investigations-toolbar"><label className="search"><Search size={17} /><input placeholder="Buscar por nome, endereço, bairro ou responsável..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{filtered.length} registro(s)</span></div>
            {error && !showForm && <p className="page-error">{error}</p>}
            {loading ? <div className="empty-state"><LoaderCircle className="spin" size={22} /> Carregando locais...</div> : filtered.length === 0 ? <div className="empty-state"><Home size={28} /><strong>Nenhum local encontrado</strong><span>Cadastre o primeiro local para ampliar a base investigativa.</span></div> : <div className="table-wrap"><table><thead><tr><th>IDENTIFICADOR</th><th>NOME</th><th>TIPO</th><th>ENDEREÇO</th><th>BAIRRO</th><th>ATUALIZADO</th></tr></thead><tbody>{filtered.map((location) => <tr className="clickable-row" key={location.id} onClick={() => openEdit(location)}><td><strong>{location.identifier}</strong></td><td><strong>{location.name}</strong></td><td>{location.data?.type || "Não informado"}</td><td>{location.data?.address || "Não informado"}</td><td>{location.data?.neighborhood || "Não informado"}</td><td className="muted">{new Date(location.updated_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div>}
          </section>
        </div>
      </section>
      {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><form className="modal person-modal" onSubmit={saveLocation} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button><p className="eyebrow">{editing ? editing.identifier : "NOVO CADASTRO"}</p><h2>{editing ? "Editar local" : "Cadastrar local"}</h2><label>Identificador fictício <span className="field-hint">(opcional)</span><input value={form.identifier} placeholder="Ex.: LOC-000001" onChange={(event) => setForm({ ...form, identifier: event.target.value })} /></label><label>Nome do local<input required minLength={2} value={form.name} placeholder="Ex.: Galpão da Zona Portuária" onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Residência</option><option>Comércio</option><option>Empresa</option><option>Galpão</option><option>Veículo abandonado</option><option>Ponto de encontro</option><option>Outro</option></select></label><label>Endereço<input value={form.address} placeholder="Ex.: Avenida principal, 120" onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><label>Bairro ou região<input value={form.neighborhood} onChange={(event) => setForm({ ...form, neighborhood: event.target.value })} /></label><label>Proprietário ou responsável<input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></label><label>Observações<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar local"}</button></div></form></div>}
    </main>
  );
}
