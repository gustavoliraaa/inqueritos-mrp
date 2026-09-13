"use client";

import { ArrowLeft, BookOpen, LoaderCircle, Search, Shield, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import AppSidebar from "../../components/app-sidebar";

type AuditActor = { full_name: string | null; role: string | null };
type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  field_name: string | null;
  reason: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  actor: AuditActor | null;
};

const actionLabels: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão"
};

export default function AuditPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLogs() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, field_name, reason, old_value, new_value, created_at, profiles!audit_logs_actor_id_fkey(full_name, role)")
      .order("created_at", { ascending: false })
      .limit(80);

    if (queryError) {
      setError("Não foi possível carregar a auditoria.");
      setLoading(false);
      return;
    }

    const mapped = (data || []).map((item) => {
      const actor = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
      return {
        id: item.id,
        action: item.action,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        field_name: item.field_name,
        reason: item.reason,
        old_value: item.old_value as Record<string, unknown> | null,
        new_value: item.new_value as Record<string, unknown> | null,
        created_at: item.created_at,
        actor: actor ? { full_name: actor.full_name || "Usuário", role: actor.role || "agente" } : null
      } satisfies AuditLog;
    });

    setLogs(mapped);
    setLoading(false);
  }

  useEffect(() => { void loadLogs(); }, []);

  const filtered = useMemo(() => logs.filter((entry) => {
    const actorName = entry.actor?.full_name || "";
    return `${entry.action} ${entry.entity_type} ${entry.field_name || ""} ${entry.reason || ""} ${actorName}`.toLowerCase().includes(query.toLowerCase());
  }), [logs, query]);

  return (
    <main className="shell">
      <AppSidebar active="Auditoria" />

      <section className="content">
        <header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><strong>Auditoria</strong></div></header>

        <div className="page people-page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">TRILHA DE ALTERAÇÕES</p>
              <h1>Auditoria</h1>
              <p className="muted">Acompanhe criação, atualização e exclusão de registros na plataforma de inteligência.</p>
            </div>
          </div>

          <section className="panel">
            <div className="investigations-toolbar">
              <label className="search"><Search size={17} /><input placeholder="Buscar por ação, entidade, responsável ou motivo..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
              <span>{filtered.length} evento(s)</span>
            </div>

            {error && <p className="page-error">{error}</p>}

            {loading ? (
              <div className="empty-state"><LoaderCircle className="spin" size={22} /> Carregando auditoria...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state"><BookOpen size={28} /><strong>Nenhuma atividade registrada</strong><span>As alterações realizadas no sistema aparecerão aqui em tempo real.</span></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>DATA</th>
                      <th>ENTIDADE</th>
                      <th>AÇÃO</th>
                      <th>RESPONSÁVEL</th>
                      <th>DETALHE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((entry) => (
                      <tr className="clickable-row" key={entry.id}>
                        <td className="muted">{new Date(entry.created_at).toLocaleString("pt-BR")}</td>
                        <td><strong>{entry.entity_type}</strong><small>{entry.field_name || "Registro principal"}</small></td>
                        <td><span className={`status status-${entry.action === "create" ? "active" : entry.action === "update" ? "em-analise" : "arquivado"}`}>{actionLabels[entry.action] || entry.action}</span></td>
                        <td><UserRound size={14} /> {entry.actor?.full_name || "Sistema"}</td>
                        <td><small>{entry.reason || "Sem observação"}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
