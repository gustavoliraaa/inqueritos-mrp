"use client";

import { LogOut, LoaderCircle, Shield } from "lucide-react";
import { useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import { useSystemIdentity } from "../../components/system-identity-provider";

export default function AccessPendingPage() {
  const identity = useSystemIdentity();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/auth/login");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand auth-brand">{identity.logo_url ? <img className="brand-logo" src={identity.logo_url} alt="" /> : <div className="brand-mark" style={{ background: identity.primary_color }}><Shield size={21} /></div>}<div><strong>{identity.system_name}</strong><span>{identity.slug}</span></div></div>
        <p className="eyebrow">ACESSO PENDENTE</p>
        <h1>Aguardando liberação</h1>
        <p className="muted">Seu cadastro foi recebido, mas um administrador ainda precisa liberar o acesso ao sistema.</p>
        <button className="primary-button auth-submit" type="button" disabled={loading} onClick={() => void logout()}>{loading ? <LoaderCircle className="spin" size={16} /> : <LogOut size={16} />} Sair</button>
      </section>
    </main>
  );
}
