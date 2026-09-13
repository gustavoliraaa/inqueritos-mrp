import { CalendarDays, ClipboardList, FileText, Link2, Users } from "lucide-react";

export type InvestigationReportData = {
  investigation: { identifier: string; title: string; description: string | null; unit: string; status: string; priority: string; opened_at: string; updated_at: string };
  people: { identifier: string; name: string; role: string; notes: string | null }[];
  entities: { identifier: string; name: string; entity_type: string; relationship: string | null; context: string | null }[];
  evidences: { identifier: string; title: string; evidence_type: string; description: string | null; collected_at: string | null; collected_location: string | null; status: string }[];
  tasks: { title: string; description: string | null; priority: string; status: string; due_at: string | null; result: string | null }[];
  timeline: { title: string; description: string | null; created_at: string }[];
};

const statusLabels: Record<string, string> = { aberto: "Aberto", em_investigacao: "Em investigação", aguardando_diligencia: "Aguardando diligência", em_analise: "Em análise", concluido: "Concluído", arquivado: "Arquivado", active: "Ativa", analyzed: "Analisada", archived: "Arquivada", pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída", bloqueada: "Bloqueada" };
const priorityLabels: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };

function label(value: string) { return statusLabels[value] || value; }
function date(value: string | null) { return value ? new Date(value).toLocaleDateString("pt-BR") : "Não informada"; }

export default function InvestigationReport({ data }: { data: InvestigationReportData }) {
  const { investigation, people, entities, evidences, tasks, timeline } = data;
  return <article className="investigation-report">
    <header className="report-header"><div><p className="eyebrow">MRP INTELLIGENCE · RELATÓRIO DE INVESTIGAÇÃO</p><h1>{investigation.title}</h1><p className="report-identifier">{investigation.identifier}</p></div><ClipboardList size={42} /></header>
    <section className="report-cover-grid"><div><span>UNIDADE RESPONSÁVEL</span><strong>{investigation.unit}</strong></div><div><span>STATUS</span><strong>{label(investigation.status)}</strong></div><div><span>PRIORIDADE</span><strong>{priorityLabels[investigation.priority] || investigation.priority}</strong></div><div><span>ABERTURA</span><strong>{date(investigation.opened_at)}</strong></div></section>
    <section className="report-section"><h2>1. Objeto da investigação</h2><p>{investigation.description || "Não foi registrada uma descrição inicial para este inquérito."}</p></section>
    <section className="report-section"><h2><Users size={18} /> 2. Pessoas vinculadas</h2>{people.length ? <div className="report-table">{people.map((person) => <div className="report-row" key={`${person.identifier}-${person.role}`}><strong>{person.name}</strong><span>{person.identifier} · {label(person.role)}</span>{person.notes && <small>{person.notes}</small>}</div>)}</div> : <p className="report-empty">Nenhuma pessoa vinculada.</p>}</section>
    <section className="report-section"><h2><Link2 size={18} /> 3. Entidades relacionadas</h2>{entities.length ? <div className="report-table">{entities.map((entity) => <div className="report-row" key={`${entity.identifier}-${entity.relationship}`}><strong>{entity.name}</strong><span>{entity.identifier} · {entity.entity_type}{entity.relationship ? ` · ${entity.relationship}` : ""}</span>{entity.context && <small>{entity.context}</small>}</div>)}</div> : <p className="report-empty">Nenhuma entidade relacionada.</p>}</section>
    <section className="report-section"><h2><FileText size={18} /> 4. Evidências</h2>{evidences.length ? <div className="report-table">{evidences.map((evidence) => <div className="report-row" key={evidence.identifier}><strong>{evidence.identifier} · {evidence.title}</strong><span>{evidence.evidence_type} · {label(evidence.status)} · Coleta: {date(evidence.collected_at)}</span>{evidence.description && <small>{evidence.description}</small>}{evidence.collected_location && <small>Local: {evidence.collected_location}</small>}</div>)}</div> : <p className="report-empty">Nenhuma evidência registrada.</p>}</section>
    <section className="report-section"><h2>5. Diligências</h2>{tasks.length ? <div className="report-table">{tasks.map((task, index) => <div className="report-row" key={`${task.title}-${index}`}><strong>{task.title}</strong><span>{label(task.status)} · Prioridade {priorityLabels[task.priority] || task.priority} · Prazo: {date(task.due_at)}</span>{task.description && <small>{task.description}</small>}{task.result && <small>Resultado: {task.result}</small>}</div>)}</div> : <p className="report-empty">Nenhuma diligência registrada.</p>}</section>
    <section className="report-section"><h2><CalendarDays size={18} /> 6. Linha do tempo</h2>{timeline.length ? <div className="report-timeline">{timeline.map((event, index) => <div key={`${event.created_at}-${index}`}><strong>{event.title}</strong><small>{new Date(event.created_at).toLocaleString("pt-BR")}</small>{event.description && <p>{event.description}</p>}</div>)}</div> : <p className="report-empty">Nenhum evento registrado.</p>}</section>
    <footer className="report-footer">Relatório atualizado em {new Date(investigation.updated_at).toLocaleString("pt-BR")}. Documento gerado pelo MRP Intelligence.</footer>
  </article>;
}
