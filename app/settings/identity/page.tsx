"use client";

import { ArrowLeft, Check, Image, LoaderCircle, Palette, Save, Shield } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabase";
import AppSidebar from "../../../components/app-sidebar";

type Identity = {
  system_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  slug: string;
  browser_name: string;
  share_image_url: string;
  share_description: string;
};

const defaults: Identity = {
  system_name: "MRP Intelligence",
  logo_url: "",
  primary_color: "#6557d8",
  secondary_color: "#162033",
  accent_color: "#4294cc",
  background_color: "#f5f7fb",
  slug: "mrp-intelligence",
  browser_name: "MRP Intelligence",
  share_image_url: "",
  share_description: "Sistema de investigação e inteligência."
};

function isImage(file: File) {
  return file.type.startsWith("image/") && file.size <= 2 * 1024 * 1024;
}

export default function IdentitySettingsPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState<Identity>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo_url" | "share_image_url" | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadIdentity() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setFeedback({ type: "error", text: "Supabase não está configurado neste ambiente." });
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "administrador") {
        setFeedback({ type: "error", text: "Apenas administradores podem editar a identidade do sistema." });
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.from("system_identity").select("*").eq("id", 1).maybeSingle();
      if (error) {
        setFeedback({ type: "error", text: "Execute a migração system-identity.sql no Supabase para habilitar esta página." });
      } else if (data) {
        setIdentity({
          system_name: data.system_name || defaults.system_name,
          logo_url: data.logo_url || "",
          primary_color: data.primary_color || defaults.primary_color,
          secondary_color: data.secondary_color || defaults.secondary_color,
          accent_color: data.accent_color || defaults.accent_color,
          background_color: data.background_color || defaults.background_color,
          slug: data.slug || defaults.slug,
          browser_name: data.browser_name || defaults.browser_name,
          share_image_url: data.share_image_url || "",
          share_description: data.share_description || defaults.share_description
        });
      }
      setLoading(false);
    }
    void loadIdentity();
  }, [router]);

  async function uploadAsset(event: ChangeEvent<HTMLInputElement>, field: "logo_url" | "share_image_url") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isImage(file)) {
      setFeedback({ type: "error", text: "Selecione uma imagem de até 2 MB." });
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setUploading(field);
    setFeedback(null);
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${field}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("system-assets").upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      setFeedback({ type: "error", text: "Não foi possível enviar a imagem. Execute a migração de identidade no Supabase." });
    } else {
      const { data } = supabase.storage.from("system-assets").getPublicUrl(path);
      setIdentity((current) => ({ ...current, [field]: data.publicUrl }));
      setFeedback({ type: "success", text: "Imagem carregada. Salve a identidade para confirmar." });
    }
    setUploading(null);
  }

  async function saveIdentity(event: FormEvent<HTMLFormElement>) {
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
    const { error } = await supabase.from("system_identity").upsert({
      id: 1,
      ...identity,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    });
    setFeedback(error
      ? { type: "error", text: "Não foi possível salvar. Confirme se você é administrador e executou a migração." }
      : { type: "success", text: "Identidade do sistema salva com sucesso." });
    setSaving(false);
  }

  if (loading) return <main className="profile-loading"><LoaderCircle className="spin" size={22} /> Carregando identidade...</main>;

  return (
    <main className="shell">
      <AppSidebar active="Configurações" />
      <section className="content">
        <header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><button className="breadcrumb-link" onClick={() => router.push("/settings")}>Configurações</button><span>/</span><strong>Identidade</strong></div></header>
        <div className="page identity-page">
          <div className="page-heading"><div><p className="eyebrow">ADMINISTRAÇÃO DO SISTEMA</p><h1>Identidade do sistema</h1><p className="muted">Personalize a marca exibida na aplicação e nos links compartilhados.</p></div><button className="secondary-button" onClick={() => router.push("/settings")}><ArrowLeft size={16} /> Voltar</button></div>
          <form className="identity-grid" onSubmit={saveIdentity}>
            <section className="panel identity-form-card">
              <div className="panel-heading"><div><h2><Shield size={18} /> Marca e navegador</h2><p>Defina os nomes usados na interface, no navegador e no endereço público.</p></div></div>
              <div className="identity-fields">
                <label>Nome do sistema<input required value={identity.system_name} onChange={(event) => setIdentity({ ...identity, system_name: event.target.value })} /></label>
                <label>Nome do navegador<input required value={identity.browser_name} onChange={(event) => setIdentity({ ...identity, browser_name: event.target.value })} /></label>
                <label>Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" title="Use letras minúsculas, números e hífens." value={identity.slug} onChange={(event) => setIdentity({ ...identity, slug: event.target.value.toLowerCase() })} /><small>Use letras minúsculas, números e hífens.</small></label>
                <label>URL da logo<input type="url" placeholder="https://..." value={identity.logo_url} onChange={(event) => setIdentity({ ...identity, logo_url: event.target.value })} /></label>
                <label>Enviar logo<input type="file" accept="image/*" onChange={(event) => void uploadAsset(event, "logo_url")} disabled={uploading !== null} /><small>PNG, JPG ou SVG até 2 MB.</small></label>
              </div>
            </section>
            <section className="panel identity-form-card">
              <div className="panel-heading"><div><h2><Palette size={18} /> Cores e padrões</h2><p>As cores ficam salvas para uso futuro no tema visual do sistema.</p></div></div>
              <div className="identity-color-grid">
                {([["primary_color", "Cor principal"], ["secondary_color", "Cor secundária"], ["accent_color", "Cor de destaque"], ["background_color", "Cor de fundo"]] as const).map(([field, label]) => <label key={field}>{label}<span className="identity-color-input"><input type="color" value={identity[field]} onChange={(event) => setIdentity({ ...identity, [field]: event.target.value })} /><input value={identity[field]} pattern="^#[0-9A-Fa-f]{6}$" onChange={(event) => setIdentity({ ...identity, [field]: event.target.value })} /></span></label>)}
              </div>
            </section>
            <section className="panel identity-form-card identity-sharing-card">
              <div className="panel-heading"><div><h2><Image size={18} /> Compartilhamento</h2><p>Informações usadas quando o sistema ou seus links forem compartilhados.</p></div></div>
              <div className="identity-fields">
                <label>Descrição para compartilhamento<textarea required maxLength={300} value={identity.share_description} onChange={(event) => setIdentity({ ...identity, share_description: event.target.value })} /></label>
                <label>URL da imagem de compartilhamento<input type="url" placeholder="https://..." value={identity.share_image_url} onChange={(event) => setIdentity({ ...identity, share_image_url: event.target.value })} /></label>
                <label>Enviar imagem de compartilhamento<input type="file" accept="image/*" onChange={(event) => void uploadAsset(event, "share_image_url")} disabled={uploading !== null} /><small>Recomendado: 1200 × 630 px e até 2 MB.</small></label>
              </div>
            </section>
            <section className="panel identity-preview-card">
              <p className="eyebrow">PRÉVIA</p><div className="identity-preview" style={{ background: identity.background_color }}><div className="identity-preview-brand">{identity.logo_url ? <img src={identity.logo_url} alt="" /> : <span style={{ background: identity.primary_color }}><Shield size={20} /></span>}<strong style={{ color: identity.secondary_color }}>{identity.system_name || "Nome do sistema"}</strong></div><p>{identity.share_description || "Descrição para compartilhamento."}</p><div className="identity-preview-link" style={{ borderColor: identity.accent_color }}>/{identity.slug || "slug-do-sistema"}</div></div>
            </section>
            {feedback && <p className={`profile-feedback ${feedback.type}`}>{feedback.type === "success" && <Check size={15} />}{feedback.text}</p>}
            <div className="profile-actions identity-actions"><button className="primary-button" disabled={saving || uploading !== null}>{saving ? <><LoaderCircle className="spin" size={16} /> Salvando...</> : <><Save size={16} /> Salvar identidade</>}</button></div>
          </form>
        </div>
      </section>
    </main>
  );
}
