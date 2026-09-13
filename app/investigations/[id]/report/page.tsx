"use client";

import { ArrowLeft, FileDown, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import InvestigationReport, { type InvestigationReportData } from "../../../../components/investigation-report";
import { getSupabaseBrowserClient } from "../../../../lib/supabase";

export default function InvestigationReportPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<InvestigationReportData | null>(null);
  const [error, setError] = useState("");

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

  if (error) return <main className="profile-loading"><p>{error}</p><button className="secondary-button" onClick={() => router.push(`/investigations/${params.id}`)}>Voltar</button></main>;
  if (!data) return <main className="profile-loading"><LoaderCircle className="spin" size={22} /> Carregando relatório...</main>;

  return <main className="report-page"><div className="report-toolbar"><button className="secondary-button" onClick={() => router.push(`/investigations/${params.id}`)}><ArrowLeft size={16} /> Voltar</button><button className="primary-button" onClick={() => window.print()}><FileDown size={16} /> Exportar PDF</button></div><InvestigationReport data={data} /></main>;
}
