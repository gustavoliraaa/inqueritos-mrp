"use client";

import {
  ArrowLeft,
  BrainCircuit,
  FileSearch,
  LoaderCircle,
  Network,
  Search,
  Shield,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type IntelligenceItem = {
  id: string;
  category: "Inquérito" | "Pessoa" | "Veículo" | "Organização" | "Local" | "Telefone" | "Evidência";
  identifier: string;
  title: string;
  subtitle: string;
  status?: string;
  value?: string;
  updated_at?: string;
  created_at?: string;
};

export default function IntelligencePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<IntelligenceItem[]>([]);

  async function loadIntelligence() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }

    const [investigationsRes, peopleRes, vehiclesRes, organizationsRes, locationsRes, phonesRes, evidencesRes] = await Promise.all([
      supabase.from("investigations").select("id, identifier, title, unit, status, updated_at").order("updated_at", { ascending: false }).limit(8),
      supabase.from("people").select("id, identifier, name, status, updated_at").order("updated_at", { ascending: false }).limit(8),
      supabase.from("entities").select("id, identifier, name, data, updated_at").eq("entity_type", "vehicle").order("updated_at", { ascending: false }).limit(8),
      supabase.from("entities").select("id, identifier, name, data, updated_at").eq("entity_type", "organization").order("updated_at", { ascending: false }).limit(8),
      supabase.from("entities").select("id, identifier, name, data, updated_at").eq("entity_type", "location").order("updated_at", { ascending: false }).limit(8),
      supabase.from("entities").select("id, identifier, name, data, updated_at").eq("entity_type", "phone").order("updated_at", { ascending: false }).limit(8),
      supabase.from("evidences").select("id, identifier, title, evidence_type, status, created_at").order("created_at", { ascending: false }).limit(8)
    ]);

    if (investigationsRes.error || peopleRes.error || vehiclesRes.error || organizationsRes.error || locationsRes.error || phonesRes.error || evidencesRes.error) {
      setError("Não foi possível carregar os dados de inteligência.");
      setLoading(false);
      return;
    }

    const nextItems: IntelligenceItem[] = [
      ...(investigationsRes.data || []).map((item): IntelligenceItem => ({
        id: item.id,
        category: "Inquérito",
        identifier: item.identifier,
        title: item.title,
        subtitle: item.unit,
        status: item.status,
        updated_at: item.updated_at
      })),
      ...(peopleRes.data || []).map((item): IntelligenceItem => ({
        id: item.id,
        category: "Pessoa",
        identifier: item.identifier,
        title: item.name,
        subtitle: item.status === "active" ? "Cadastro ativo" : "Cadastro inativo",
        updated_at: item.updated_at
      })),
      ...(vehiclesRes.data || []).map((item): IntelligenceItem => ({
        id: item.id,
        category: "Veículo",
        identifier: item.identifier,
        title: item.name || item.data?.model || "Veículo",
        subtitle: item.data?.color ? `${item.data.color} · ${item.data.owner || "Proprietário não definido"}` : item.data?.owner || "Sem detalhes",
        value: item.data?.owner || "",
        updated_at: item.updated_at
      })),
      ...(organizationsRes.data || []).map((item): IntelligenceItem => ({
        id: item.id,
        category: "Organização",
        identifier: item.identifier,
        title: item.name,
        subtitle: item.data?.type || "Organização",
        value: item.data?.members || "",
        updated_at: item.updated_at
      })),
      ...(locationsRes.data || []).map((item): IntelligenceItem => ({
        id: item.id,
        category: "Local",
        identifier: item.identifier,
        title: item.name,
        subtitle: item.data?.address || item.data?.area || "Local relacionado",
        value: item.data?.address || "",
        updated_at: item.updated_at
      })),
      ...(phonesRes.data || []).map((item): IntelligenceItem => ({
        id: item.id,
        category: "Telefone",
        identifier: item.identifier,
        title: item.name,
        subtitle: item.data?.number || "Número não informado",
        value: item.data?.number || "",
        updated_at: item.updated_at
      })),
      ...(evidencesRes.data || []).map((item): IntelligenceItem => ({
        id: item.id,
        category: "Evidência",
        identifier: item.identifier,
        title: item.title,
        subtitle: item.evidence_type,
        status: item.status,
        updated_at: item.created_at
      }))
    ];

    setItems(nextItems.sort((a, b) => {
      const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
      const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
      return timeB - timeA;
    }));
    setLoading(false);
  }

  useEffect(() => { void loadIntelligence(); }, []);

  const metrics = useMemo(() => ({
    investigations: items.filter((item) => item.category === "Inquérito").length,
    people: items.filter((item) => item.category === "Pessoa").length,
    entities: items.filter((item) => ["Veículo", "Organização", "Local", "Telefone"].includes(item.category)).length,
    evidences: items.filter((item) => item.category === "Evidência").length
  }), [items]);

  const filtered = items.filter((item) => `${item.category} ${item.identifier} ${item.title} ${item.subtitle} ${item.status || ""} ${item.value || ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Shield size={21} /></div><div><strong>MRP</strong><span>INTELLIGENCE</span></div></div>
        <p className="nav-label">INTELIGÊNCIA</p>
        <button className="nav-item active"><BrainCircuit size={18} /><span>Central de inteligência</span></button>
        <button className="nav-item" onClick={() => router.push("/")}><ArrowLeft size={18} /><span>Voltar para central</span></button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><strong>Inteligência</strong></div>
        </header>

        <div className="page people-page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">CENTRAL DE RELACIONAMENTOS</p>
              <h1>Inteligência</h1>
              <p className="muted">Pesquise e acompanhe a base de inquéritos, pessoas, veículos, organizações, locais e evidências em um único painel.</p>
            </div>
          </div>

          <div className="metrics">
            <div className="metric-card"><div className="metric-icon purple"><FileSearch size={19} /></div><span>Inquéritos</span><strong>{metrics.investigations}</strong><small className="positive">em análise e atuação</small></div>
            <div className="metric-card"><div className="metric-icon blue"><Users size={19} /></div><span>Pessoas</span><strong>{metrics.people}</strong><small className="positive">cadastradas na base</small></div>
            <div className="metric-card"><div className="metric-icon amber"><Network size={19} /></div><span>Entidades</span><strong>{metrics.entities}</strong><small className="warning">veículos, locais e contatos</small></div>
            <div className="metric-card"><div className="metric-icon green"><Shield size={19} /></div><span>Evidências</span><strong>{metrics.evidences}</strong><small className="positive">associadas à investigação</small></div>
          </div>

          <section className="panel">
            <div className="investigations-toolbar">
              <label className="search"><Search size={17} /><input placeholder="Buscar por identificador, nome, tipo, status ou descrição..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
              <span>{filtered.length} registro(s)</span>
            </div>

            {error && <p className="page-error">{error}</p>}

            {loading ? (
              <div className="empty-state"><LoaderCircle className="spin" size={22} /> Carregando inteligência...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state"><BrainCircuit size={28} /><strong>Nenhuma correlação encontrada</strong><span>Refine a busca para localizar pessoas, veículos, organizações ou evidências.</span></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>IDENTIFICADOR</th>
                      <th>REGISTRO</th>
                      <th>CATEGORIA</th>
                      <th>ATUALIZAÇÃO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr className="clickable-row" key={`${item.category}-${item.id}`}>
                        <td><strong>{item.identifier}</strong></td>
                        <td>
                          <strong>{item.title}</strong>
                          <small>{item.subtitle}</small>
                        </td>
                        <td>
                          <span className="status status-active">{item.category}</span>
                        </td>
                        <td className="muted">{item.updated_at ? new Date(item.updated_at).toLocaleDateString("pt-BR") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading"><div><h2>Ativos principais</h2><p>Base operacional em destaque</p></div></div>
              <div className="activity-list">
                <div><span className="activity-dot purple-dot" /><p><strong>Casos em investigação</strong><span>{metrics.investigations} inquéritos ativos em suporte operacional</span><small>Atualização contínua da unidade</small></p></div>
                <div><span className="activity-dot blue-dot" /><p><strong>Pessoas cadastradas</strong><span>{metrics.people} registros de pessoas com histórico, apelidos e vínculos</span><small>Base consolidada para cruzamento</small></p></div>
                <div><span className="activity-dot amber-dot" /><p><strong>Entidades e contatos</strong><span>{metrics.entities} veículos, locais, organizações e telefones relacionados</span><small>Utilizados em triagem e rastreio</small></p></div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading"><div><h2>Linhas de investigação</h2><p>Áreas prioritárias</p></div></div>
              <div className="activity-list">
                <div><span className="activity-dot green-dot" /><p><strong>Vínculos e conexões</strong><span>People, veículos, organizações e locais são rastreados por associação aos inquéritos.</span><small>Relações e cruzamentos em tempo real</small></p></div>
                <div><span className="activity-dot purple-dot" /><p><strong>Evidências</strong><span>Documentos, mídias e materiais com controle de status e origem.</span><small>Registro probatório e anexos</small></p></div>
                <div><span className="activity-dot blue-dot" /><p><strong>Operações</strong><span>Monitoramento de diligências e tarefas operacionais por caso.</span><small>Controle de ações e pendências</small></p></div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
