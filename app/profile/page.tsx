"use client";

import { ArrowLeft, Check, LoaderCircle, Save, Shield, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import AppSidebar from "../../components/app-sidebar";

type Profile = {
  full_name: string;
  unit: string;
  avatar_url: string;
  role: string;
  email: string;
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "US";
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({ full_name: "", unit: "", avatar_url: "", role: "agente", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFeedback({ type: "error", text: "Supabase não está configurado neste ambiente." });
      setLoading(false);
      return;
    }
    const client = supabase;

    async function loadProfile() {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) {
        router.replace("/auth/login");
        return;
      }

      const { data, error } = await client
        .from("profiles")
        .select("full_name, unit, avatar_url, role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setFeedback({ type: "error", text: "Não foi possível carregar seu perfil." });
      } else {
        setProfile({
          full_name: data?.full_name || user.user_metadata?.full_name || "",
          unit: data?.unit || "",
          avatar_url: data?.avatar_url || "",
          role: data?.role || "agente",
          email: user.email || ""
        });
      }
      setLoading(false);
    }

    void loadProfile();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFeedback({ type: "error", text: "Supabase não está configurado neste ambiente." });
      setSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name.trim(),
        unit: profile.unit.trim() || null,
        avatar_url: profile.avatar_url.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (error) {
      setFeedback({ type: "error", text: "Não foi possível salvar as alterações. Tente novamente." });
    } else {
      setFeedback({ type: "success", text: "Perfil atualizado com sucesso." });
    }
    setSaving(false);
  }

  if (loading) {
    return <main className="profile-loading"><LoaderCircle className="spin" size={22} /> Carregando perfil...</main>;
  }

  return (
    <main className="shell">
      <AppSidebar active="Configurações" />
      <section className="content">
        <header className="topbar">
          <div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><strong>Meu perfil</strong></div>
        </header>
        <div className="page profile-page">
          <div className="page-heading"><div><p className="eyebrow">CONFIGURAÇÕES DA CONTA</p><h1>Meu perfil</h1><p className="muted">Atualize suas informações de identificação no sistema.</p></div><button className="secondary-button" onClick={() => router.push("/")}>Voltar</button></div>
          <form className="profile-grid" onSubmit={handleSubmit}>
            <section className="panel profile-card">
              <div className="profile-card-heading"><div className="profile-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar do usuário" /> : initials(profile.full_name)}</div><div><h2>{profile.full_name || "Seu nome"}</h2><p>{profile.email}</p><span className="role-pill">{profile.role.replaceAll("_", " ")}</span></div></div>
              <div className="profile-divider" />
              <p className="profile-help">Seu cargo é administrado pelo sistema e não pode ser alterado nesta tela.</p>
            </section>
            <section className="panel profile-form-card">
              <div className="panel-heading"><div><h2>Dados pessoais</h2><p>Informações exibidas para sua equipe.</p></div></div>
              <div className="profile-fields">
                <label>Nome completo<input required minLength={2} value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} /></label>
                <label>E-mail de acesso<input value={profile.email} readOnly disabled /></label>
                <label>Unidade<input placeholder="Ex.: Unidade Central" value={profile.unit} onChange={(event) => setProfile({ ...profile, unit: event.target.value })} /></label>
                <label>URL do avatar<input type="url" placeholder="https://..." value={profile.avatar_url} onChange={(event) => setProfile({ ...profile, avatar_url: event.target.value })} /></label>
              </div>
              {feedback && <p className={`profile-feedback ${feedback.type}`}>{feedback.type === "success" && <Check size={15} />}{feedback.text}</p>}
              <div className="profile-actions"><button className="primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={16} /> Salvando...</> : <><Save size={16} /> Salvar alterações</>}</button></div>
            </section>
          </form>
        </div>
      </section>
    </main>
  );
}
