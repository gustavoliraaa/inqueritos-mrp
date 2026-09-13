import { createClient } from "@supabase/supabase-js";
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

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: "Configure SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor." }, { status: 500 });
  }

  const body = await request.json() as { email?: string; password?: string; full_name?: string; unit?: string; role?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password || "";
  const fullName = body.full_name?.trim();
  const unit = body.unit?.trim() || null;
  const allowedRoles = ["agente", "investigador", "delegado", "corregedoria", "administrador"];

  if (!email || !fullName || password.length < 6 || !body.role || !allowedRoles.includes(body.role)) {
    return NextResponse.json({ error: "Informe nome, e-mail, senha com pelo menos 6 caracteres e um cargo válido." }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || "Não foi possível criar o usuário." }, { status: 400 });
  }

  const { error: profileError } = await adminClient.from("profiles").update({
    full_name: fullName,
    unit,
    role: body.role,
    access_enabled: false,
    updated_at: new Date().toISOString()
  }).eq("id", created.user.id);

  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "A conta foi criada, mas o perfil não pôde ser configurado." }, { status: 500 });
  }

  return NextResponse.json({ id: created.user.id });
}
