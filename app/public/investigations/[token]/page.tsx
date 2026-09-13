"use client";

import { AlertCircle, CalendarDays, ClipboardList, LoaderCircle, Users } from "lucide-react";
import { useEffect, useState } from "react";

type PublicData = {
  investigation: { identifier: string; title: string; description: string | null; unit: string; status: string; priority: string; opened_at: string; updated_at: string };
  people: { identifier: string; name: string; role: string; notes: string | null }[];
  timeline: { title: string; description: string | null; created_at: string }[];
};

const statusLabels: Record<string, string> = { aberto: "Aberto", em_investigacao: "Em investigação", aguardando_diligencia: "Aguardando diligência", em_analise: "Em análise", concluido: "Concluído", arquivado: "Arquivado" };
const priorityLabels: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };

export default function PublicInvestigationPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<PublicData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/public/investigations/${params.token}`).then(async (response) => {
      const result = await response.json() as PublicData & { error?: string };
      if (!response.ok) setError(result.error || "Não foi possível carregar o inquérito.");
      else setData(result);
    }).catch(() => setError("Não foi possível carregar o inquérito."));
  }, [params.token]);

  if (error) return <main className="public-share-page"><div className="public-share-message"><AlertCircle size={30} /><h1>Link indisponível</h1><p>{error}</p></div></main>;
  if (!data) return <main className="public-share-page"><div className="public-share-message"><LoaderCircle className="spin" size={24} /> Carregando inquérito...</div></main>;

  const { investigation, people, timeline } = data;
  return <main className="public-share-page"><article className="public-share-card"><header className="public-share-header"><div><p className="eyebrow">MRP INTELLIGENCE · COMPARTILHAMENTO PÚBLICO</p><h1>{investigation.title}</h1><p className="muted">{investigation.identifier}</p></div><ClipboardList size={34} /></header><div className="public-share-meta"><span>Status: <strong>{statusLabels[investigation.status] || investigation.status}</strong></span><span>Prioridade: <strong>{priorityLabels[investigation.priority] || investigation.priority}</strong></span><span>Unidade: <strong>{investigation.unit}</strong></span></div><section><h2>Descrição</h2><p>{investigation.description || "Nenhuma descrição informada."}</p></section><section><h2><Users size={18} /> Pessoas vinculadas</h2>{people.length === 0 ? <p className="muted">Nenhuma pessoa vinculada.</p> : <div className="public-share-list">{people.map((person) => <div key={`${person.identifier}-${person.role}`}><strong>{person.name}</strong><span>{person.identifier} · {person.role}</span>{person.notes && <small>{person.notes}</small>}</div>)}</div>}</section><section><h2><CalendarDays size={18} /> Linha do tempo</h2>{timeline.length === 0 ? <p className="muted">Nenhum evento registrado.</p> : <div className="public-share-timeline">{timeline.map((event, index) => <div key={`${event.created_at}-${index}`}><strong>{event.title}</strong><p>{event.description}</p><small>{new Date(event.created_at).toLocaleString("pt-BR")}</small></div>)}</div>}</section><footer>Última atualização: {new Date(investigation.updated_at).toLocaleString("pt-BR")}</footer></article></main>;
}
