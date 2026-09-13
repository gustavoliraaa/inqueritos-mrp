"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Configure as variáveis do Supabase na Vercel ou no arquivo .env.local.");
      setLoading(false);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError("E-mail ou senha inválidos. Verifique os dados e tente novamente.");
      setLoading(false);
      return;
    }

    window.location.assign("/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand auth-brand"><div className="brand-mark">◆</div><div><strong>MRP</strong><span>INTELLIGENCE</span></div></div>
        <p className="eyebrow">ACESSO RESTRITO</p>
        <h1>Entrar no sistema</h1>
        <p className="muted">Use suas credenciais para acessar a central de investigação.</p>
        <form onSubmit={handleSubmit}>
          <label>E-mail<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Senha<input type="password" required minLength={6} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button auth-submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
        </form>
        <p className="auth-footer">Ainda não possui acesso? <Link href="/auth/signup">Solicitar cadastro</Link></p>
      </section>
    </main>
  );
}
