import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase-server";

type RouteContext = { params: { id: string } };

const groqUrl = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(_request: Request, { params }: RouteContext) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "A integração com a IA não está configurada no servidor." }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não está configurado no servidor." }, { status: 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });

  const [{ data: investigation, error: investigationError }, { data: people }, { data: entities }, { data: evidences }, { data: tasks }, { data: timeline }] = await Promise.all([
    supabase.from("investigations").select("identifier, title, description, unit, status, priority, opened_at, updated_at").eq("id", params.id).maybeSingle(),
    supabase.from("investigation_people").select("role, notes, people(identifier, name)").eq("investigation_id", params.id),
    supabase.from("investigation_entities").select("relationship, context, entities(identifier, name, entity_type)").eq("investigation_id", params.id),
    supabase.from("evidences").select("identifier, title, evidence_type, description, collected_at, collected_location, status").eq("investigation_id", params.id).order("created_at", { ascending: false }),
    supabase.from("tasks").select("title, description, priority, status, due_at, result").eq("investigation_id", params.id).order("created_at", { ascending: false }),
    supabase.from("timeline_events").select("title, description, created_at").eq("investigation_id", params.id).order("created_at", { ascending: false })
  ]);

  if (investigationError || !investigation) {
    return NextResponse.json({ error: "Inquérito não encontrado ou sem permissão de acesso." }, { status: 404 });
  }

  const context = {
    investigation,
    people: (people || []).map((link) => {
      const person = Array.isArray(link.people) ? link.people[0] : link.people;
      return person ? { ...person, role: link.role, notes: link.notes } : null;
    }).filter(Boolean),
    entities: (entities || []).map((link) => {
      const entity = Array.isArray(link.entities) ? link.entities[0] : link.entities;
      return entity ? { ...entity, relationship: link.relationship, context: link.context } : null;
    }).filter(Boolean),
    evidences: evidences || [],
    tasks: tasks || [],
    timeline: timeline || []
  };

  const response = await fetch(groqUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 1400,
      messages: [
        {
          role: "system",
          content: "Você é um assistente de apoio à análise de inquéritos. Responda em português do Brasil. Gere somente um rascunho profissional e objetivo com os títulos: Resumo executivo, Síntese cronológica, Pontos de atenção e Próximas diligências sugeridas. Use exclusivamente os dados fornecidos. Nunca invente fatos, nomes, provas, datas ou conclusões. Diferencie fatos registrados de sugestões. Informe ao final que o texto precisa de revisão humana."
        },
        {
          role: "user",
          content: `Produza um rascunho de análise para revisão humana a partir destes dados estruturados:\n${JSON.stringify(context)}`
        }
      ]
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Groq request failed", response.status, details);
    return NextResponse.json({ error: "Não foi possível gerar o rascunho com a IA." }, { status: 502 });
  }

  const result: { choices?: { message?: { content?: string } }[] } = await response.json();
  const draft = result.choices?.[0]?.message?.content?.trim();
  if (!draft) return NextResponse.json({ error: "A IA não retornou um texto válido." }, { status: 502 });

  return NextResponse.json({ draft });
}
