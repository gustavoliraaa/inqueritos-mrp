import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  const sessionClient = await getSupabaseServerClient();
  if (!sessionClient) {
    return NextResponse.json({ error: "Supabase não está configurado." }, { status: 500 });
  }

  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: currentProfile } = await sessionClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (currentProfile?.role !== "administrador") {
    return NextResponse.json({ error: "Apenas administradores podem convidar usuários." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as { role?: string; max_uses?: number };
  const allowedRoles = ["agente", "investigador", "delegado", "corregedoria", "administrador"];
  const role = body.role || "agente";
  const maxUses = Number(body.max_uses);
  if (!allowedRoles.includes(role) || !Number.isInteger(maxUses) || maxUses < 1 || maxUses > 1000) {
    return NextResponse.json({ error: "Informe um cargo válido e uma quantidade de usos entre 1 e 1000." }, { status: 400 });
  }

  const token = randomBytes(32).toString("hex");
  const { error: inviteError } = await sessionClient.from("user_invites").insert({ token, created_by: user.id, role, max_uses: maxUses });
  if (inviteError) {
    return NextResponse.json({ error: "Não foi possível gerar o convite. Execute a migração de convites no Supabase." }, { status: 500 });
  }

  const origin = request.headers.get("origin") || new URL(request.url).origin;
  return NextResponse.json({ url: `${origin}/auth/invite/${token}` });
}
