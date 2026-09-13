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
  Pencil,
  Save,
  Settings as SettingsIcon,
  Shield,
  UserRound,
  Users,
  X
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type SettingsProfile = {
  id: string;
  full_name: string;
  unit: string;
  role: string;
  email: string;
};

type ManagedUser = {
  id: string;
  full_name: string;
  unit: string | null;
  role: string;
  updated_at: string;
};

const roleLabels: Record<string, string> = {
  agente: "Agente",
  investigador: "Investigador",
  delegado: "Delegado",
  corregedoria: "Corregedoria",
  administrador: "Administrador"
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
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [userForm, setUserForm] = useState({ full_name: "", unit: "", role: "agente" });
  const [userSaving, setUserSaving] = useState(false);
  const [userFeedback, setUserFeedback] = useState("");

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

      if (data?.role === "administrador") {
        const { data: managedUsers, error: usersError } = await client
          .from("profiles")
          .select("id, full_name, unit, role, updated_at")
          .order("full_name", { ascending: true });
        if (usersError) {
          setUserFeedback("Não foi possível carregar os usuários do sistema.");
        } else {
          setUsers(managedUsers || []);
        }
      }
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

  function openUserEditor(user: ManagedUser) {
    setEditingUser(user);
    setUserForm({ full_name: user.full_name, unit: user.unit || "", role: user.role });
    setUserFeedback("");
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    setUserSaving(true);
    setUserFeedback("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setUserFeedback("Supabase não está configurado neste ambiente.");
      setUserSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      setUserSaving(false);
      return;
    }

    const { error } = await supabase.from("profiles").update({
      full_name: userForm.full_name.trim(),
      unit: userForm.unit.trim() || null,
      role: userForm.role,
      updated_at: new Date().toISOString()
    }).eq("id", editingUser.id);

    if (error) {
      setUserFeedback("Não foi possível atualizar o usuário. Verifique suas permissões.");
    } else {
      setUsers((current) => current.map((item) => item.id === editingUser.id ? { ...item, ...userForm, unit: userForm.unit.trim() || null, updated_at: new Date().toISOString() } : item));
      setEditingUser(null);
      setUserFeedback("Usuário atualizado com sucesso.");
      if (editingUser.id === user.id) {
        setProfile((current) => ({ ...current, full_name: userForm.full_name.trim(), unit: userForm.unit.trim(), role: userForm.role }));
      }
    }
    setUserSaving(false);
  }

  const filteredUsers = users.filter((user) => `${user.full_name} ${user.unit || ""} ${roleLabels[user.role] || user.role}`.toLowerCase().includes(userQuery.toLowerCase()));

  if (loading) {
    return <main className="profile-loading"><LoaderCircle className="spin" size={22} /> Carregando configurações...</main>;
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Shield size={21} /></div><div><strong>MRP</strong><span>INTELLIGENCE</span></div></div>
        <div className="profile-sidebar-card"><div className="avatar">{initials(profile.full_name)}</div><div><strong>{profile.full_name || "Usuário"}</strong><span>{profile.role.replaceAll("_", " ")}</span></div></div>
        <p className="nav-label">SISTEMA</p>
        <button className="nav-item" onClick={() => router.push("/audit")}><BookOpen size={18} /><span>Auditoria</span></button>
        <button className="nav-item active"><SettingsIcon size={18} /><span>Configurações</span></button>
        <button className="nav-item" onClick={() => router.push("/")}><ArrowLeft size={18} /><span>Voltar para central</span></button>
      </aside>

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
            <section className="panel settings-info-card"><div className="settings-info-icon"><Shield size={19} /></div><div><h2>Segurança e acesso</h2><p>Sua sessão é protegida pelo Supabase Auth. O nível de acesso atual é <strong>{profile.role.replaceAll("_", " ")}</strong>.</p><button className="text-button" type="button" onClick={() => router.push("/audit")}>Consultar auditoria <ChevronRight size={14} /></button></div></section>
            <section className="panel settings-info-card"><div className="settings-info-icon"><Info size={19} /></div><div><h2>Sobre o sistema</h2><p>MRP Intelligence · Ambiente operacional fictício para uso em roleplay.</p><button className="text-button" type="button" onClick={() => router.push("/profile")}>Ver dados do perfil <ChevronRight size={14} /></button></div></section>
          </div>

          <section className="panel settings-danger-card"><div><h2>Sessão atual</h2><p>Encerrar o acesso neste dispositivo. Você poderá entrar novamente usando suas credenciais.</p></div><button type="button" className="secondary-button logout-button" onClick={() => void logout()}><LogOut size={16} /> Sair do sistema</button></section>

          {profile.role === "administrador" && <section className="panel user-management-panel">
            <div className="panel-heading"><div><h2>Controle de usuários</h2><p>Gerencie nome, unidade e nível de acesso dos usuários cadastrados.</p></div><span className="role-pill"><Users size={13} /> Administrador</span></div>
            <div className="user-management-toolbar"><label className="search"><Users size={16} /><input placeholder="Buscar por nome, unidade ou cargo..." value={userQuery} onChange={(event) => setUserQuery(event.target.value)} /></label><span>{filteredUsers.length} usuário(s)</span></div>
            {userFeedback && <p className="profile-feedback success">{userFeedback}</p>}
            {filteredUsers.length === 0 ? <div className="empty-state"><Users size={25} /><strong>Nenhum usuário encontrado</strong></div> : <div className="table-wrap"><table><thead><tr><th>USUÁRIO</th><th>UNIDADE</th><th>CARGO</th><th>ATUALIZADO</th><th /></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id}><td><strong>{user.full_name || "Sem nome"}</strong>{user.id === profile.id && <small>Usuário atual</small>}</td><td>{user.unit || "Não definida"}</td><td><span className="role-pill">{roleLabels[user.role] || user.role}</span></td><td className="muted">{new Date(user.updated_at).toLocaleDateString("pt-BR")}</td><td><button className="more-button" type="button" aria-label={`Editar ${user.full_name}`} onClick={() => openUserEditor(user)}><Pencil size={15} /></button></td></tr>)}</tbody></table></div>}
            <p className="settings-admin-help">A criação, remoção e redefinição de senha das contas continuam sendo administradas pelo Supabase Auth.</p>
          </section>}
        </div>
      </section>

      {editingUser && <div className="modal-backdrop" onClick={() => setEditingUser(null)}><form className="modal" onSubmit={saveUser} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setEditingUser(null)}><X size={18} /></button><p className="eyebrow">CONTROLE DE USUÁRIO</p><h2>Editar usuário</h2><label>Nome completo<input required minLength={2} value={userForm.full_name} onChange={(event) => setUserForm({ ...userForm, full_name: event.target.value })} /></label><label>Unidade operacional<input value={userForm.unit} onChange={(event) => setUserForm({ ...userForm, unit: event.target.value })} /></label><label>Cargo<select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}><option value="agente">Agente</option><option value="investigador">Investigador</option><option value="delegado">Delegado</option><option value="corregedoria">Corregedoria</option><option value="administrador">Administrador</option></select></label>{userFeedback && <p className="form-error">{userFeedback}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditingUser(null)}>Cancelar</button><button className="primary-button" disabled={userSaving}>{userSaving ? "Salvando..." : "Salvar usuário"}</button></div></form></div>}
    </main>
  );
}
