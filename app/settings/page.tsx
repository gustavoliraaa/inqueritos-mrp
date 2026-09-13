"use client";

import {
  ArrowLeft,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  CircleUserRound,
  Info,
  LoaderCircle,
  LogOut,
  Palette,
  Save,
  Settings as SettingsIcon,
  Shield,
  UserRound
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import AppSidebar from "../../components/app-sidebar";

type SettingsProfile = {
  id: string;
  full_name: string;
  unit: string;
  role: string;
  email: string;
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "US";
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<SettingsProfile>({ id: "", full_name: "", unit: "", role: "agente", email: "" });
  const [notifications, setNotifications] = useState(true);
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

    async function loadSettings() {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) {
        router.replace("/auth/login");
        return;
      }

      const { data, error } = await client.from("profiles").select("full_name, unit, role").eq("id", user.id).maybeSingle();
      if (error) {
        setFeedback({ type: "error", text: "Não foi possível carregar as configurações." });
      } else {
        setProfile({
          id: user.id,
          full_name: data?.full_name || user.user_metadata?.full_name || "",
          unit: data?.unit || "",
          role: data?.role || "agente",
          email: user.email || ""
        });
      }

      const storedNotifications = window.localStorage.getItem("mrp-notifications-enabled");
      setNotifications(storedNotifications !== "false");

      setLoading(false);
    }

    void loadSettings();
  }, [router]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFeedback({ type: "error", text: "Supabase não está configurado neste ambiente." });
      setSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name.trim(),
      unit: profile.unit.trim() || null,
      updated_at: new Date().toISOString()
    }).eq("id", user.id);

    if (error) {
      setFeedback({ type: "error", text: "Não foi possível salvar as configurações." });
    } else {
      window.localStorage.setItem("mrp-notifications-enabled", String(notifications));
      setFeedback({ type: "success", text: "Configurações salvas com sucesso." });
    }
    setSaving(false);
  }

  async function logout() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/auth/login");
  }

  if (loading) {
    return <main className="profile-loading"><LoaderCircle className="spin" size={22} /> Carregando configurações...</main>;
  }

  return (
    <main className="shell">
      <AppSidebar active="Configurações" />

      <section className="content">
        <header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><strong>Configurações</strong></div></header>
        <div className="page profile-page">
          <div className="page-heading"><div><p className="eyebrow">PREFERÊNCIAS DO SISTEMA</p><h1>Configurações</h1><p className="muted">Gerencie seus dados de acesso e preferências operacionais.</p></div></div>

          <form className="profile-grid" onSubmit={saveSettings}>
            <section className="panel profile-card">
              <div className="profile-card-heading"><div className="profile-avatar">{initials(profile.full_name)}</div><div><h2>{profile.full_name || "Seu nome"}</h2><p>{profile.email}</p><span className="role-pill">{profile.role.replaceAll("_", " ")}</span></div></div>
              <div className="profile-divider" />
              <p className="profile-help">O cargo e as permissões são controlados pelo sistema. Para solicitar alterações, procure um administrador.</p>
              <button type="button" className="secondary-button settings-link-button" onClick={() => router.push("/profile")}><CircleUserRound size={16} /> Abrir meu perfil <ChevronRight size={15} /></button>
            </section>

            <section className="panel profile-form-card">
              <div className="panel-heading"><div><h2>Preferências gerais</h2><p>Dados exibidos para sua equipe e preferências deste dispositivo.</p></div></div>
              <div className="profile-fields">
                <label>Nome completo<input required minLength={2} value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} /></label>
                <label>E-mail de acesso<input value={profile.email} readOnly disabled /></label>
                <label>Unidade operacional<input placeholder="Ex.: Unidade Central" value={profile.unit} onChange={(event) => setProfile({ ...profile, unit: event.target.value })} /></label>
              </div>
              <label className="settings-toggle"><span><Bell size={16} /><span><strong>Notificações operacionais</strong><small>Manter alertas de atividades e pendências habilitados neste dispositivo.</small></span></span><input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} /></label>
              {feedback && <p className={`profile-feedback ${feedback.type}`}>{feedback.type === "success" && <Check size={15} />}{feedback.text}</p>}
              <div className="profile-actions"><button className="primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={16} /> Salvando...</> : <><Save size={16} /> Salvar configurações</>}</button></div>
            </section>
          </form>

          <div className="settings-grid">
            {profile.role === "administrador" && <section className="panel settings-info-card settings-user-management-link"><div className="settings-info-icon"><Palette size={19} /></div><div><h2>Identidade do sistema</h2><p>Edite logo, nome, cores, slug e informações de compartilhamento.</p><button className="text-button" type="button" onClick={() => router.push("/settings/identity")}>Configurar identidade <ChevronRight size={14} /></button></div></section>}
            <section className="panel settings-info-card"><div className="settings-info-icon"><Shield size={19} /></div><div><h2>Segurança e acesso</h2><p>Sua sessão é protegida pelo Supabase Auth. O nível de acesso atual é <strong>{profile.role.replaceAll("_", " ")}</strong>.</p><button className="text-button" type="button" onClick={() => router.push("/audit")}>Consultar auditoria <ChevronRight size={14} /></button></div></section>
            <section className="panel settings-info-card"><div className="settings-info-icon"><Info size={19} /></div><div><h2>Sobre o sistema</h2><p>MRP Intelligence · Ambiente operacional fictício para uso em roleplay.</p><button className="text-button" type="button" onClick={() => router.push("/profile")}>Ver dados do perfil <ChevronRight size={14} /></button></div></section>
          </div>

          <section className="panel settings-danger-card"><div><h2>Sessão atual</h2><p>Encerrar o acesso neste dispositivo. Você poderá entrar novamente usando suas credenciais.</p></div><button type="button" className="secondary-button logout-button" onClick={() => void logout()}><LogOut size={16} /> Sair do sistema</button></section>
          {profile.role === "administrador" && <section className="panel settings-info-card settings-user-management-link"><div className="settings-info-icon"><UserRound size={19} /></div><div><h2>Gestão de usuários</h2><p>Administre nomes, unidades e níveis de acesso dos usuários do sistema.</p><button className="text-button" type="button" onClick={() => router.push("/settings/users")}>Abrir gestão de usuários <ChevronRight size={14} /></button></div></section>}
        </div>
      </section>
    </main>
  );
}
