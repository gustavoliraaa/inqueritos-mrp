"use client";

import { ArrowLeft, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import InvestigationReport, { type InvestigationReportData } from "../../../../components/investigation-report";
import { getSupabaseBrowserClient } from "../../../../lib/supabase";

export default function InvestigationReportPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<InvestigationReportData | null>(null);
  const [error, setError] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [aiError, setAiError] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function loadReport() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { setError("Supabase não está configurado neste ambiente."); return; }
      const [{ data: investigation, error: investigationError }, { data: people }, { data: entities }, { data: evidences }, { data: tasks }, { data: timeline }] = await Promise.all([
        supabase.from("investigations").select("identifier, title, description, unit, status, priority, opened_at, updated_at").eq("id", params.id).maybeSingle(),
        supabase.from("investigation_people").select("role, notes, people(identifier, name)").eq("investigation_id", params.id),
        supabase.from("investigation_entities").select("relationship, context, entities(identifier, name, entity_type)").eq("investigation_id", params.id),
        supabase.from("evidences").select("identifier, title, evidence_type, description, collected_at, collected_location, status").eq("investigation_id", params.id).order("created_at", { ascending: false }),
        supabase.from("tasks").select("title, description, priority, status, due_at, result").eq("investigation_id", params.id).order("created_at", { ascending: false }),
        supabase.from("timeline_events").select("title, description, created_at").eq("investigation_id", params.id).order("created_at", { ascending: false })
      ]);
      if (investigationError || !investigation) { setError("Inquérito não encontrado ou sem permissão."); return; }
      setData({
        investigation,
        people: (people || []).flatMap((link) => { const person = Array.isArray(link.people) ? link.people[0] : link.people; return person ? [{ ...person, role: link.role, notes: link.notes }] : []; }),
        entities: (entities || []).flatMap((link) => { const entity = Array.isArray(link.entities) ? link.entities[0] : link.entities; return entity ? [{ ...entity, relationship: link.relationship, context: link.context }] : []; }),
        evidences: evidences || [],
        tasks: tasks || [],
        timeline: timeline || []
      });
    }
    void loadReport();
  }, [params.id]);

  async function generateAiDraft() {
    setGenerating(true);
    setAiError("");
    try {
      const response = await fetch(`/api/investigations/${params.id}/ai-summary`, { method: "POST" });
      const result = await response.json() as { draft?: string; error?: string };
      if (!response.ok || !result.draft) {
        setAiError(result.error || "Não foi possível gerar o rascunho.");
      } else {
        setAiDraft(result.draft);
      }
    } catch {
      setAiError("Não foi possível conectar ao serviço de IA.");
    } finally {
      setGenerating(false);
    }
  }

  if (error) return <main className="profile-loading"><p>{error}</p><button className="secondary-button" onClick={() => router.push(`/investigations/${params.id}`)}>Voltar</button></main>;
  if (!data) return <main className="profile-loading"><LoaderCircle className="spin" size={22} /> Carregando relatório...</main>;

  return <main className="report-page"><div className="report-toolbar"><button className="secondary-button" onClick={() => router.push(`/investigations/${params.id}`)}><ArrowLeft size={16} /> Voltar</button><button className="secondary-button" onClick={() => void generateAiDraft()} disabled={generating}><Sparkles size={16} /> {generating ? "Analisando..." : "Gerar rascunho com IA"}</button></div>{aiError && <p className="profile-feedback error">{aiError}</p>}{aiDraft && <section className="ai-draft"><div className="ai-draft-heading"><div><p className="eyebrow">ASSISTENTE DE IA · RASCUNHO</p><h2>Análise preliminar</h2></div><Sparkles size={22} /></div><p className="ai-draft-warning">Conteúdo gerado por IA. Revise e valide todas as informações antes de usar ou compartilhar.</p><div className="ai-draft-content">{aiDraft}</div></section>}<InvestigationReport data={data} /></main>;
}
