import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type InviteParams = { params: { token: string } };

async function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(_request: Request, { params }: InviteParams) {
  const adminClient = await getAdminClient();
  if (!adminClient) return NextResponse.json({ error: "Convites não estão configurados no servidor." }, { status: 500 });

  const { data: invite, error } = await adminClient.from("user_invites")
    .select("role, max_uses, uses_count, expires_at")
    .eq("token", params.token)
    .maybeSingle();
  if (error || !invite || new Date(invite.expires_at).getTime() < Date.now() || invite.uses_count >= invite.max_uses) {
    return NextResponse.json({ error: "Este convite é inválido, expirou ou já atingiu o limite de usos." }, { status: 400 });
  }
  return NextResponse.json({ role: invite.role, remaining_uses: invite.max_uses - invite.uses_count, expires_at: invite.expires_at });
}

export async function POST(request: Request, { params }: InviteParams) {
  const adminClient = await getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Convites não estão configurados no servidor." }, { status: 500 });
  }

  const { data: claimedInvite, error: claimError } = await adminClient.rpc("claim_user_invite", { invite_token: params.token });
  const invite = claimedInvite?.[0];
  if (claimError || !invite) {
    return NextResponse.json({ error: "Este convite já está sendo utilizado ou expirou." }, { status: 409 });
  }

  const body = await request.json() as { email?: string; password?: string; full_name?: string; unit?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password || "";
  const fullName = body.full_name?.trim();
  const unit = body.unit?.trim() || null;
  if (!email || !fullName || password.length < 6) {
    await adminClient.rpc("release_user_invite", { invite_id: invite.invite_id });
    return NextResponse.json({ error: "Informe nome, e-mail e senha com pelo menos 6 caracteres." }, { status: 400 });
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
  if (createError || !created.user) {
    await adminClient.rpc("release_user_invite", { invite_id: invite.invite_id });
    return NextResponse.json({ error: createError?.message || "Não foi possível criar o usuário." }, { status: 400 });
  }

  const { error: profileError } = await adminClient.from("profiles").update({ full_name: fullName, unit, role: invite.invited_role, access_enabled: false, updated_at: new Date().toISOString() }).eq("id", created.user.id);
  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    await adminClient.rpc("release_user_invite", { invite_id: invite.invite_id });
    return NextResponse.json({ error: "O perfil não pôde ser configurado." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
