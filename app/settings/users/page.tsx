"use client";

import { ArrowLeft, BookOpen, Check, KeyRound, LoaderCircle, Pencil, Plus, Search, Settings as SettingsIcon, Shield, UserRound, Users, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

type ManagedUser = {
  id: string;
  full_name: string;
  unit: string | null;
  role: string;
  access_enabled: boolean;
  updated_at: string;
};

type RolePermission = {
  role: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
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

export default function UserManagementPage() {
  const router = useRouter();
  const [profile, setProfile] = useState({ id: "", full_name: "", role: "agente" });
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState("");
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState({ full_name: "", unit: "", role: "agente" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", password: "", full_name: "", unit: "", role: "agente" });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFeedback("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }
    const client = supabase;

    async function loadUsers() {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) {
        router.replace("/auth/login");
        return;
      }

      const { data: currentProfile, error: profileError } = await client.from("profiles").select("id, full_name, role").eq("id", user.id).maybeSingle();
      if (profileError || currentProfile?.role !== "administrador") {
        setFeedback("Apenas administradores podem acessar a gestão de usuários.");
        setLoading(false);
        return;
      }

      setProfile({ id: user.id, full_name: currentProfile.full_name || user.email || "Usuário", role: currentProfile.role });
      const { data: managedUsers, error: usersError } = await client.from("profiles").select("id, full_name, unit, role, access_enabled, updated_at").order("full_name", { ascending: true });
      if (usersError) {
        setFeedback("Não foi possível carregar os usuários do sistema.");
      } else {
        setUsers(managedUsers || []);
      }
      const { data: rolePermissions, error: permissionsError } = await client
        .from("role_permissions")
        .select("role, can_view, can_create, can_edit, can_delete, updated_at")
        .order("role", { ascending: true });
      if (permissionsError) {
        setFeedback("Execute a migração de permissões no Supabase para habilitar as liberações por cargo.");
      } else {
        setPermissions(rolePermissions || []);
      }
      setLoading(false);
    }

    void loadUsers();
  }, [router]);

  function openEditor(user: ManagedUser) {
    setEditingUser(user);
    setForm({ full_name: user.full_name, unit: user.unit || "", role: user.role });
    setFeedback("");
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    setFeedback("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFeedback("Supabase não está configurado neste ambiente.");
      setSaving(false);
      return;
    }

    async function inviteUser(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      setInviteSaving(true);
      setFeedback("");
      const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inviteForm) });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setFeedback(result.error || "Não foi possível convidar o usuário.");
      } else {
        setShowInvite(false);
        setInviteForm({ email: "", password: "", full_name: "", unit: "", role: "agente" });
        setFeedback("Usuário criado e bloqueado até a liberação de um administrador. Atualize a lista para visualizá-lo.");
      }
      setInviteSaving(false);
    }

    async function toggleAccess(user: ManagedUser) {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setFeedback("Supabase não está configurado neste ambiente.");
        return;
      }
      const { error } = await supabase.from("profiles").update({ access_enabled: !user.access_enabled, updated_at: new Date().toISOString() }).eq("id", user.id);
      if (error) {
        setFeedback("Não foi possível alterar a liberação do usuário.");
      } else {
        setUsers((current) => current.map((item) => item.id === user.id ? { ...item, access_enabled: !user.access_enabled } : item));
        setFeedback(user.access_enabled ? "Acesso bloqueado." : "Acesso liberado.");
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      setSaving(false);
      return;
    }

    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name.trim(),
      unit: form.unit.trim() || null,
      role: form.role,
      updated_at: updatedAt
    }).eq("id", editingUser.id);

    if (error) {
      setFeedback("Não foi possível atualizar o usuário. Verifique suas permissões.");
    } else {
      setUsers((current) => current.map((item) => item.id === editingUser.id ? { ...item, full_name: form.full_name.trim(), unit: form.unit.trim() || null, role: form.role, updated_at: updatedAt } : item));
      setEditingUser(null);
      setFeedback("Usuário atualizado com sucesso.");
      if (editingUser.id === user.id) {
        setProfile((current) => ({ ...current, full_name: form.full_name.trim(), role: form.role }));
      }
    }
    setSaving(false);
  }

  async function savePermissions() {
    setPermissionsSaving(true);
    setFeedback("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFeedback("Supabase não está configurado neste ambiente.");
      setPermissionsSaving(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      setPermissionsSaving(false);
      return;
    }

    const updatedAt = new Date().toISOString();
    const updates = permissions.map((permission) => ({
      role: permission.role,
      can_view: permission.can_view,
      can_create: permission.can_create,
      can_edit: permission.can_edit,
      can_delete: permission.can_delete,
      updated_at: updatedAt,
      updated_by: user.id
    }));
    const { data, error } = await supabase.from("role_permissions").upsert(updates, { onConflict: "role" }).select("role, can_view, can_create, can_edit, can_delete, updated_at");
    if (error) {
      setFeedback("Não foi possível salvar as liberações. Verifique a migração e suas permissões.");
    } else {
      setPermissions(data || permissions);
      setFeedback("Liberações por cargo salvas com sucesso.");
    }
    setPermissionsSaving(false);
  }

  const filteredUsers = users.filter((user) => `${user.full_name} ${user.unit || ""} ${roleLabels[user.role] || user.role}`.toLowerCase().includes(query.toLowerCase()));
  const updatePermission = (role: string, field: "can_view" | "can_create" | "can_edit" | "can_delete") => {
    setPermissions((current) => current.map((permission) => permission.role === role ? { ...permission, [field]: !permission[field] } : permission));
  };

  if (loading) {
    return <main className="profile-loading"><LoaderCircle className="spin" size={22} /> Carregando gestão de usuários...</main>;
  }

  if (profile.role !== "administrador") {
    return <main className="profile-loading"><div><p className="page-error">{feedback || "Acesso restrito a administradores."}</p><button className="secondary-button" onClick={() => router.push("/settings")}>Voltar para configurações</button></div></main>;
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Shield size={21} /></div><div><strong>MRP</strong><span>INTELLIGENCE</span></div></div>
        <div className="profile-sidebar-card"><div className="avatar">{initials(profile.full_name)}</div><div><strong>{profile.full_name}</strong><span>Administrador</span></div></div>
        <p className="nav-label">SISTEMA</p>
        <button className="nav-item" onClick={() => router.push("/audit")}><BookOpen size={18} /><span>Auditoria</span></button>
        <button className="nav-item active"><SettingsIcon size={18} /><span>Configurações</span></button>
        <button className="nav-item" onClick={() => router.push("/settings")}><ArrowLeft size={18} /><span>Voltar para configurações</span></button>
      </aside>

      <section className="content">
        <header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><button className="breadcrumb-link" onClick={() => router.push("/settings")}>Configurações</button><span>/</span><strong>Gestão de usuários</strong></div></header>
        <div className="page people-page">
          <div className="page-heading"><div><p className="eyebrow">ADMINISTRAÇÃO DO SISTEMA</p><h1>Gestão de usuários</h1><p className="muted">Gerencie os perfis, unidades e níveis de acesso dos usuários cadastrados.</p></div><div className="page-heading-actions"><button className="secondary-button" onClick={() => router.push("/settings")}><ArrowLeft size={16} /> Configurações</button><button className="primary-button" onClick={() => setShowInvite(true)}><Plus size={16} /> Convidar usuário</button></div></div>
          <section className="panel user-management-panel">
            <div className="panel-heading"><div><h2>Usuários do sistema</h2><p>As contas e senhas continuam sendo administradas pelo Supabase Auth.</p></div><span className="role-pill"><Users size={13} /> Administrador</span></div>
            <div className="user-management-toolbar"><label className="search"><Search size={16} /><input placeholder="Buscar por nome, unidade ou cargo..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{filteredUsers.length} usuário(s)</span></div>
            {feedback && <p className="profile-feedback success">{feedback}</p>}
            {filteredUsers.length === 0 ? <div className="empty-state"><Users size={25} /><strong>Nenhum usuário encontrado</strong></div> : <div className="table-wrap"><table><thead><tr><th>USUÁRIO</th><th>UNIDADE</th><th>CARGO</th><th>ACESSO</th><th>ATUALIZADO</th><th /></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id}><td><strong>{user.full_name || "Sem nome"}</strong>{user.id === profile.id && <small>Usuário atual</small>}</td><td>{user.unit || "Não definida"}</td><td><span className="role-pill">{roleLabels[user.role] || user.role}</span></td><td><button type="button" className={`access-pill ${user.access_enabled ? "enabled" : "pending"}`} onClick={() => void toggleAccess(user)}>{user.access_enabled ? "Liberado" : "Pendente"}</button></td><td className="muted">{new Date(user.updated_at).toLocaleDateString("pt-BR")}</td><td><button className="more-button" type="button" aria-label={`Editar ${user.full_name}`} onClick={() => openEditor(user)}><Pencil size={15} /></button></td></tr>)}</tbody></table></div>}
            <p className="settings-admin-help">A criação, remoção e redefinição de senha das contas continuam sendo administradas pelo Supabase Auth.</p>
          </section>
          <section className="panel user-management-panel permissions-panel">
            <div className="panel-heading"><div><h2>Liberações por cargo</h2><p>Defina as ações de visualizar, criar, editar e excluir. Os cargos padrão não podem ser alterados.</p></div><span className="role-pill"><Shield size={13} /> Acesso</span></div>
            {permissions.length === 0 ? <div className="empty-state"><Shield size={25} /><strong>Nenhuma configuração de permissão carregada</strong><span>Execute o arquivo supabase/role-permissions.sql no projeto Supabase.</span></div> : <><div className="table-wrap"><table><thead><tr><th>CARGO</th><th>VISUALIZAR</th><th>CRIAR</th><th>EDITAR</th><th>EXCLUIR</th></tr></thead><tbody>{permissions.map((permission) => <tr key={permission.role}><td><strong>{roleLabels[permission.role] || permission.role}</strong><small>{permission.role}</small></td><td><label className="permission-check"><input type="checkbox" checked={permission.can_view} onChange={() => updatePermission(permission.role, "can_view")} /><Check size={14} /></label></td><td><label className="permission-check"><input type="checkbox" checked={permission.can_create} onChange={() => updatePermission(permission.role, "can_create")} /><Check size={14} /></label></td><td><label className="permission-check"><input type="checkbox" checked={permission.can_edit} onChange={() => updatePermission(permission.role, "can_edit")} /><Check size={14} /></label></td><td><label className="permission-check"><input type="checkbox" checked={permission.can_delete} onChange={() => updatePermission(permission.role, "can_delete")} /><Check size={14} /></label></td></tr>)}</tbody></table></div><div className="profile-actions"><button className="primary-button" type="button" disabled={permissionsSaving} onClick={() => void savePermissions()}>{permissionsSaving ? "Salvando..." : "Salvar liberações"}</button></div></>}
          </section>
        </div>
      </section>

      {editingUser && <div className="modal-backdrop" onClick={() => setEditingUser(null)}><form className="modal" onSubmit={saveUser} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setEditingUser(null)}><X size={18} /></button><p className="eyebrow">GESTÃO DE USUÁRIOS</p><h2>Editar usuário</h2><label>Nome completo<input required minLength={2} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label><label>Unidade operacional<input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></label><label>Cargo<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="agente">Agente</option><option value="investigador">Investigador</option><option value="delegado">Delegado</option><option value="corregedoria">Corregedoria</option><option value="administrador">Administrador</option></select></label>{feedback && <p className="form-error">{feedback}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditingUser(null)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar usuário"}</button></div></form></div>}
      {showInvite && <div className="modal-backdrop" onClick={() => setShowInvite(false)}><form className="modal" onSubmit={inviteUser} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowInvite(false)}><X size={18} /></button><p className="eyebrow">NOVO ACESSO</p><h2>Convidar usuário</h2><p className="modal-help">O usuário será criado sem acesso até um administrador liberar a conta.</p><label>Nome completo<input required minLength={2} value={inviteForm.full_name} onChange={(event) => setInviteForm({ ...inviteForm, full_name: event.target.value })} /></label><label>E-mail<input type="email" required value={inviteForm.email} onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })} /></label><label>Senha inicial<input type="password" required minLength={6} autoComplete="new-password" value={inviteForm.password} onChange={(event) => setInviteForm({ ...inviteForm, password: event.target.value })} /></label><label>Unidade<input value={inviteForm.unit} onChange={(event) => setInviteForm({ ...inviteForm, unit: event.target.value })} /></label><label>Cargo<select value={inviteForm.role} onChange={(event) => setInviteForm({ ...inviteForm, role: event.target.value })}><option value="agente">Agente</option><option value="investigador">Investigador</option><option value="delegado">Delegado</option><option value="corregedoria">Corregedoria</option><option value="administrador">Administrador</option></select></label>{feedback && <p className="form-error">{feedback}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowInvite(false)}>Cancelar</button><button className="primary-button" disabled={inviteSaving}>{inviteSaving ? "Criando..." : "Criar usuário"}</button></div></form></div>}
    </main>
  );
}
