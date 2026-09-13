"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";

export default function PublicInvitePage() {
  const params = useParams<{ token: string }>();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", unit: "", role: "agente" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch(`/api/public/invites/${params.token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json() as { error?: string };
    if (!response.ok) setError(result.error || "Não foi possível enviar o cadastro.");
    else {
      setMessage("Cadastro enviado. Aguarde a liberação de um administrador para acessar o sistema.");
      setForm({ full_name: "", email: "", password: "", unit: "", role: "agente" });
    }
    setSaving(false);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand auth-brand"><div className="brand-mark">◆</div><div><strong>MRP</strong><span>INTELLIGENCE</span></div></div>
        <p className="eyebrow">CONVITE DE ACESSO</p><h1>Solicitar cadastro</h1><p className="muted">Preencha seus dados. O acesso será liberado por um administrador após a análise.</p>
        <form onSubmit={submit}>
          <label>Nome completo<input required minLength={2} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
          <label>E-mail<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Senha<input type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          <label>Unidade<input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></label>
          <label>Cargo<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="agente">Agente</option><option value="investigador">Investigador</option><option value="delegado">Delegado</option><option value="corregedoria">Corregedoria</option><option value="administrador">Administrador</option></select></label>
          {error && <p className="form-error">{error}</p>}{message && <p className="form-success">{message}</p>}
          <button className="primary-button auth-submit" disabled={saving}>{saving ? "Enviando..." : "Enviar cadastro"}</button>
        </form>
      </section>
    </main>
  );
}
