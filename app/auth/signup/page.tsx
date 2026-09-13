"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Configure as variáveis do Supabase na Vercel ou no arquivo .env.local.");
      setLoading(false);
      return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (signupError) {
      setError(signupError.message);
    } else if (data.session) {
      window.location.assign("/");
      return;
    } else {
      setMessage("Cadastro criado. Verifique seu e-mail para confirmar o acesso.");
    }
    setLoading(false);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand auth-brand"><div className="brand-mark">◆</div><div><strong>MRP</strong><span>INTELLIGENCE</span></div></div>
        <p className="eyebrow">NOVO USUÁRIO</p>
        <h1>Criar acesso</h1>
        <p className="muted">O administrador poderá revisar seu perfil após o cadastro.</p>
        <form onSubmit={handleSubmit}>
          <label>Nome completo<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>E-mail<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Senha<input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}
          <button className="primary-button auth-submit" disabled={loading}>{loading ? "Criando..." : "Criar cadastro"}</button>
        </form>
        <p className="auth-footer">Já possui acesso? <Link href="/auth/login">Voltar para o login</Link></p>
      </section>
    </main>
  );
}
