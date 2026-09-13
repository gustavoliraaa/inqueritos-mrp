import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type ShareParams = { params: { token: string } };

async function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(_request: Request, { params }: ShareParams) {
  const adminClient = await getAdminClient();
  if (!adminClient) return NextResponse.json({ error: "Compartilhamento público não está configurado no servidor." }, { status: 500 });

  const { data: share, error: shareError } = await adminClient
    .from("investigation_shares")
    .select("investigation_id")
    .eq("token", params.token)
    .is("revoked_at", null)
    .maybeSingle();
  if (shareError || !share) return NextResponse.json({ error: "Este link público é inválido ou foi revogado." }, { status: 404 });

  const [{ data: investigation, error: investigationError }, { data: people }, { data: timeline }] = await Promise.all([
    adminClient.from("investigations").select("identifier, title, description, unit, status, priority, opened_at, updated_at").eq("id", share.investigation_id).maybeSingle(),
    adminClient.from("investigation_people").select("role, notes, people(identifier, name)").eq("investigation_id", share.investigation_id),
    adminClient.from("timeline_events").select("title, description, created_at").eq("investigation_id", share.investigation_id).order("created_at", { ascending: false })
  ]);
  if (investigationError || !investigation) return NextResponse.json({ error: "Inquérito não encontrado." }, { status: 404 });

  return NextResponse.json({
    investigation,
    people: (people || []).map((link) => {
      const person = Array.isArray(link.people) ? link.people[0] : link.people;
      return person ? { ...person, role: link.role, notes: link.notes } : null;
    }).filter(Boolean),
    timeline: timeline || []
  }, { headers: { "Cache-Control": "no-store" } });
}
