"use client";

import { ArrowLeft, Car, LoaderCircle, Plus, Search, Shield, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type Vehicle = {
  id: string;
  identifier: string;
  name: string;
  data: { model?: string; color?: string; owner?: string; notes?: string };
  updated_at: string;
};

const emptyForm = { identifier: "", model: "", color: "", owner: "", notes: "" };

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadVehicles() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase
      .from("entities")
      .select("id, identifier, name, data, updated_at")
      .eq("entity_type", "vehicle")
      .order("updated_at", { ascending: false });
    if (queryError) setError("Não foi possível carregar os veículos.");
    else setVehicles((data || []) as Vehicle[]);
    setLoading(false);
  }

  useEffect(() => { void loadVehicles(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    setForm({
      identifier: vehicle.identifier,
      model: vehicle.data?.model || vehicle.name,
      color: vehicle.data?.color || "",
      owner: vehicle.data?.owner || "",
      notes: vehicle.data?.notes || ""
    });
    setError("");
    setShowForm(true);
  }

  async function saveVehicle(event: FormEvent<HTMLFormElement>) {
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
    const model = form.model.trim();
    const identifier = form.identifier.trim().toUpperCase();
    let operationError: string | null = null;
    if (editing) {
      const { error: updateError } = await supabase.from("entities").update({
        identifier,
        name: model,
        data: { model, color: form.color.trim(), owner: form.owner.trim(), notes: form.notes.trim() },
        updated_at: new Date().toISOString()
      }).eq("id", editing.id);
      operationError = updateError ? "Não foi possível salvar as alterações." : null;
    } else {
      const { data: generatedIdentifier, error: identifierError } = identifier
        ? { data: identifier, error: null }
        : await supabase.rpc("next_vehicle_identifier");
      if (identifierError) {
        setError("Não foi possível gerar o identificador do veículo.");
        setSaving(false);
        return;
      }
      const { error: insertError } = await supabase.from("entities").insert({
        entity_type: "vehicle",
        identifier: generatedIdentifier,
        name: model,
        data: { model, color: form.color.trim(), owner: form.owner.trim(), notes: form.notes.trim() },
        created_by: user.id
      });
      operationError = insertError ? "Não foi possível cadastrar o veículo. A placa/identificador pode já existir." : null;
    }
    if (operationError) {
      setError(operationError);
    } else {
      setShowForm(false);
      setLoading(true);
      await loadVehicles();
    }
    setSaving(false);
  }

  const filtered = vehicles.filter((vehicle) =>
    `${vehicle.identifier} ${vehicle.name} ${vehicle.data?.color || ""} ${vehicle.data?.owner || ""}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="shell">
      <aside className="sidebar"><div className="brand"><div className="brand-mark"><Shield size={21} /></div><div><strong>MRP</strong><span>INTELLIGENCE</span></div></div><p className="nav-label">INTELIGÊNCIA</p><button className="nav-item active"><Car size={18} /><span>Veículos</span></button><button className="nav-item" onClick={() => router.push("/")}><ArrowLeft size={18} /><span>Voltar para central</span></button></aside>
      <section className="content"><header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><strong>Veículos</strong></div></header>
        <div className="page people-page"><div className="page-heading"><div><p className="eyebrow">CADASTRO COMPLEMENTAR</p><h1>Veículos</h1><p className="muted">Cadastre veículos reutilizáveis nas investigações.</p></div><button className="primary-button" onClick={openCreate}><Plus size={18} /> Novo veículo</button></div>
          <section className="panel"><div className="investigations-toolbar"><label className="search"><Search size={17} /><input placeholder="Buscar por placa, modelo, cor ou proprietário..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{filtered.length} registro(s)</span></div>{error && !showForm && <p className="page-error">{error}</p>}{loading ? <div className="empty-state"><LoaderCircle className="spin" size={22} /> Carregando veículos...</div> : filtered.length === 0 ? <div className="empty-state"><Car size={28} /><strong>Nenhum veículo encontrado</strong><span>Cadastre o primeiro veículo para ampliar a base investigativa.</span></div> : <div className="table-wrap"><table><thead><tr><th>PLACA / ID</th><th>MODELO</th><th>COR</th><th>PROPRIETÁRIO CONHECIDO</th><th>ATUALIZADO</th></tr></thead><tbody>{filtered.map((vehicle) => <tr className="clickable-row" key={vehicle.id} onClick={() => openEdit(vehicle)}><td><strong>{vehicle.identifier}</strong></td><td><strong>{vehicle.data?.model || vehicle.name}</strong></td><td>{vehicle.data?.color || "Não informada"}</td><td>{vehicle.data?.owner || "Desconhecido"}</td><td className="muted">{new Date(vehicle.updated_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div>}</section>
        </div>
      </section>
      {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><form className="modal person-modal" onSubmit={saveVehicle} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button><p className="eyebrow">{editing ? editing.identifier : "NOVO CADASTRO"}</p><h2>{editing ? "Editar veículo" : "Cadastrar veículo"}</h2><label>Placa ou identificador fictício <span className="field-hint">(opcional)</span><input value={form.identifier} placeholder="Ex.: ABC-1234" onChange={(event) => setForm({ ...form, identifier: event.target.value })} /></label><label>Modelo<input required minLength={2} value={form.model} placeholder="Ex.: Sultan RS" onChange={(event) => setForm({ ...form, model: event.target.value })} /></label><label>Cor<input value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></label><label>Proprietário conhecido<input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></label><label>Observações<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar veículo"}</button></div></form></div>}
    </main>
  );
}
