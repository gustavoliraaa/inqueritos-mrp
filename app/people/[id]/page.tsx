"use client";

import { ArrowLeft, LoaderCircle, Shield, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

type Person = {
  id: string;
  identifier: string;
  name: string;
  document_id: string | null;
  aliases: string[];
  birth_date: string | null;
  notes: string | null;
  status: string;
  updated_at: string;
};

type CaseLink = {
  role: string;
  notes: string | null;
  investigations: { id: string; identifier: string; title: string; status: string; priority: string } | null;
};

const roles: Record<string, string> = { investigado: "Investigado", vitima: "Vítima", testemunha: "Testemunha", citado: "Citado", outro: "Outro" };
const statuses: Record<string, string> = { aberto: "Aberto", em_investigacao: "Em investigação", aguardando_diligencia: "Aguardando diligência", em_analise: "Em análise", concluido: "Concluído", arquivado: "Arquivado" };

export default function PersonDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [person, setPerson] = useState<Person | null>(null);
  const [links, setLinks] = useState<CaseLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }

    async function loadPerson() {
      const { data, error: personError } = await supabase.from("people").select("id, identifier, name, document_id, aliases, birth_date, notes, status, updated_at").eq("id", params.id).maybeSingle();
      if (personError || !data) {
        setError("Pessoa não encontrada ou sem permissão de acesso.");
        setLoading(false);
        return;
      }
      setPerson(data);
      const { data: relationshipData } = await supabase
        .from("investigation_people")
        .select("role, notes, investigations(id, identifier, title, status, priority)")
        .eq("person_id", params.id);
      setLinks((relationshipData || []).flatMap((link) => {
        const investigation = Array.isArray(link.investigations) ? link.investigations[0] : link.investigations;
        return investigation ? [{ role: link.role, notes: link.notes, investigations: investigation }] : [];
      }));
      setLoading(false);
    }

    void loadPerson();
  }, [params.id]);

  if (loading) return <main className="profile-loading"><LoaderCircle className="spin" size={22} /> Carregando pessoa...</main>;
  if (!person) return <main className="profile-loading"><p>{error || "Pessoa indisponível."}</p><button className="secondary-button" onClick={() => router.push("/people")}>Voltar</button></main>;

  return (
    <main className="shell">
      <aside className="sidebar"><div className="brand"><div className="brand-mark"><Shield size={21} /></div><div><strong>MRP</strong><span>INTELLIGENCE</span></div></div><p className="nav-label">INTELIGÊNCIA</p><button className="nav-item active"><UserRound size={18} /><span>Pessoa</span></button><button className="nav-item" onClick={() => router.push("/people")}><ArrowLeft size={18} /><span>Todas as pessoas</span></button></aside>
      <section className="content"><header className="topbar"><div className="breadcrumbs"><button className="breadcrumb-link" onClick={() => router.push("/")}>Central</button><span>/</span><button className="breadcrumb-link" onClick={() => router.push("/people")}>Pessoas</button><span>/</span><strong>{person.identifier}</strong></div></header>
        <div className="page person-detail-page"><div className="page-heading"><div><p className="eyebrow">{person.identifier}</p><h1>{person.name}</h1><p className="muted">Visão consolidada do cadastro central.</p></div><div className="detail-heading-actions"><button className="secondary-button" onClick={() => router.push("/people")}><ArrowLeft size={16} /> Voltar</button></div></div>
          <div className="person-summary-grid"><section className="panel person-summary-card"><div className="person-large-avatar">{person.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div><h2>{person.name}</h2><span className="person-status">{person.status === "active" ? "Cadastro ativo" : "Cadastro inativo"}</span><button className="secondary-button edit-person-button" onClick={() => router.push("/people")}>Voltar para cadastros</button></section>
            <section className="panel person-data-card"><div className="panel-heading"><div><h2>Dados cadastrais</h2><p>Informações registradas na base central.</p></div></div><dl className="person-data-list"><div><dt>Identificador</dt><dd>{person.identifier}</dd></div><div><dt>Documento fictício</dt><dd>{person.document_id || "Não informado"}</dd></div><div><dt>Data de nascimento</dt><dd>{person.birth_date ? new Date(`${person.birth_date}T00:00:00`).toLocaleDateString("pt-BR") : "Não informada"}</dd></div><div><dt>Apelidos</dt><dd>{person.aliases.length ? person.aliases.join(", ") : "Nenhum registrado"}</dd></div><div className="full-width"><dt>Observações</dt><dd>{person.notes || "Nenhuma observação registrada."}</dd></div></dl></section>
          </div>
          <section className="panel person-cases-panel"><div className="panel-heading"><div><h2>Histórico em inquéritos</h2><p>Casos em que esta pessoa foi relacionada.</p></div><strong className="case-count">{links.length}</strong></div>{links.length === 0 ? <div className="empty-state"><span>Nenhum inquérito relacionado.</span></div> : <div className="person-case-list">{links.map((link) => link.investigations && <button className="person-case-row" key={`${link.investigations.id}-${link.role}`} onClick={() => router.push(`/investigations/${link.investigations?.id}`)}><div><strong>{link.investigations.identifier}</strong><span>{link.investigations.title}</span></div><span className="role-pill">{roles[link.role] || link.role}</span><span className={`status status-${link.investigations.status}`}>{statuses[link.investigations.status] || link.investigations.status}</span><span className="case-arrow">→</span></button>)}</div></section>
        </div>
      </section>
    </main>
  );
}
