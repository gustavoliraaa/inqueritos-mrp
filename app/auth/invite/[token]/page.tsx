"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

const roleLabels: Record<string, string> = {
  agente: "Agente",
  investigador: "Investigador",
  delegado: "Delegado",
  corregedoria: "Corregedoria",
  administrador: "Administrador"
};

export default function PublicInvitePage() {
  const params = useParams<{ token: string }>();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", unit: "" });
  const [inviteRole, setInviteRole] = useState("");
  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch(`/api/public/invites/${params.token}`)
      .then(async (response) => {
        const result = await response.json() as { error?: string; role?: string; remaining_uses?: number };
        if (!response.ok) throw new Error(result.error || "Este convite não está disponível.");
        setInviteRole(result.role || "");
        setRemainingUses(result.remaining_uses ?? null);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Este convite não está disponível."));
  }, [params.token]);

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
      setForm({ full_name: "", email: "", password: "", unit: "" });
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
          <label>Cargo pré-definido<input readOnly value={roleLabels[inviteRole] || "Carregando..."} /></label>
          {remainingUses !== null && <p className="muted">Usos restantes neste convite: {remainingUses}</p>}
          {error && <p className="form-error">{error}</p>}{message && <p className="form-success">{message}</p>}
          <button className="primary-button auth-submit" disabled={saving}>{saving ? "Enviando..." : "Enviar cadastro"}</button>
        </form>
      </section>
    </main>
  );
}
