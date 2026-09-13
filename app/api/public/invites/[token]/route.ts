import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type InviteParams = { params: { token: string } };

export async function POST(request: Request, { params }: InviteParams) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Convites não estão configurados no servidor." }, { status: 500 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: invite, error: inviteError } = await adminClient.from("user_invites").select("id, expires_at, used_at").eq("token", params.token).maybeSingle();
  if (inviteError || !invite || invite.used_at || new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Este convite é inválido, expirou ou já foi utilizado." }, { status: 400 });
  }

  const claimTimestamp = new Date().toISOString();
  const { data: claimedInvite, error: claimError } = await adminClient
    .from("user_invites")
    .update({ used_at: claimTimestamp })
    .eq("id", invite.id)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();
  if (claimError || !claimedInvite) {
    return NextResponse.json({ error: "Este convite já está sendo utilizado ou expirou." }, { status: 409 });
  }

  const body = await request.json() as { email?: string; password?: string; full_name?: string; unit?: string; role?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password || "";
  const fullName = body.full_name?.trim();
  const unit = body.unit?.trim() || null;
  const allowedRoles = ["agente", "investigador", "delegado", "corregedoria", "administrador"];
  if (!email || !fullName || password.length < 6 || !body.role || !allowedRoles.includes(body.role)) {
    await adminClient.from("user_invites").update({ used_at: null }).eq("id", invite.id).eq("used_at", claimTimestamp);
    return NextResponse.json({ error: "Informe nome, e-mail, senha com pelo menos 6 caracteres e um cargo válido." }, { status: 400 });
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
  if (createError || !created.user) {
    await adminClient.from("user_invites").update({ used_at: null }).eq("id", invite.id).eq("used_at", claimTimestamp);
    return NextResponse.json({ error: createError?.message || "Não foi possível criar o usuário." }, { status: 400 });
  }

  const { error: profileError } = await adminClient.from("profiles").update({ full_name: fullName, unit, role: body.role, access_enabled: false, updated_at: new Date().toISOString() }).eq("id", created.user.id);
  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    await adminClient.from("user_invites").update({ used_at: null }).eq("id", invite.id).eq("used_at", claimTimestamp);
    return NextResponse.json({ error: "O perfil não pôde ser configurado." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
