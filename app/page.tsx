"use client";

import {
  Archive,
  Bell,
  BookOpen,
  Car,
  ChevronDown,
  ClipboardList,
  FileSearch,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Network,
  Plus,
  Phone,
  Search,
  Settings,
  Shield,
  UserRound,
  Users,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase";

type CaseStatus = "Em investigação" | "Aguardando diligência" | "Em análise" | "Concluído";

type Investigation = {
  id: string;
  title: string;
  unit: string;
  status: CaseStatus;
  priority: "Alta" | "Média" | "Baixa";
  updated: string;
};

const investigations: Investigation[] = [
  {
    id: "IP-2026-000184",
    title: "Operação Linha Verde",
    unit: "Divisão de Investigações",
    status: "Em investigação",
    priority: "Alta",
    updated: "há 12 min"
  },
  {
    id: "IP-2026-000181",
    title: "Rede de veículos clonados",
    unit: "Delegacia Central",
    status: "Aguardando diligência",
    priority: "Média",
    updated: "há 1 h"
  },
  {
    id: "IP-2026-000176",
    title: "Conexão Mirror Park",
    unit: "Divisão de Investigações",
    status: "Em análise",
    priority: "Alta",
    updated: "ontem"
  },
  {
    id: "IP-2026-000169",
    title: "Furto no Porto de Los Santos",
    unit: "Distrito Sul",
    status: "Concluído",
    priority: "Baixa",
    updated: "há 3 dias"
  }
];

const navItems = [
  { label: "Central", icon: LayoutDashboard },
  { label: "Inquéritos", icon: ClipboardList },
  { label: "Pessoas", icon: Users },
  { label: "Veículos", icon: Car },
  { label: "Organizações", icon: Shield },
  { label: "Locais", icon: MapPin },
  { label: "Telefones", icon: Phone },
  { label: "Evidências", icon: Archive },
  { label: "Inteligência", icon: Network }
];

function StatusBadge({ status }: { status: CaseStatus }) {
  return <span className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>;
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "US";
}

export default function HomePage() {
  const router = useRouter();
  const [active, setActive] = useState("Central");
  const [showModal, setShowModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState({ name: "Delegado Almeida", role: "Administrador", email: "" });
  const filtered = investigations.filter((item) =>
    `${item.id} ${item.title} ${item.unit}`.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;

    async function loadProfile() {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;

      const { data: profileData } = await client
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      setProfile({
        name: profileData?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário",
        role: profileData?.role ? profileData.role.replaceAll("_", " ") : "Agente",
        email: user.email || ""
      });
    }

    void loadProfile();
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/auth/login");
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Shield size={21} /></div>
          <div><strong>MRP</strong><span>INTELLIGENCE</span></div>
        </div>
        <div className="workspace-switcher">
          <div className="avatar avatar-small">DA</div>
          <div><strong>Departamento de Polícia</strong><span>Unidade Central</span></div>
          <ChevronDown size={15} />
        </div>
        <p className="nav-label">NAVEGAÇÃO</p>
        <nav>
          {navItems.map(({ label, icon: Icon }) => (
            <button className={`nav-item ${active === label ? "active" : ""}`} key={label} onClick={() => label === "Inquéritos" ? router.push("/investigations") : label === "Pessoas" ? router.push("/people") : label === "Veículos" ? router.push("/vehicles") : label === "Organizações" ? router.push("/organizations") : label === "Locais" ? router.push("/locations") : label === "Telefones" ? router.push("/phones") : label === "Evidências" ? router.push("/evidences") : setActive(label)}>
              <Icon size={18} /><span>{label}</span>
              {label === "Inquéritos" && <b>12</b>}
            </button>
          ))}
        </nav>
        <p className="nav-label nav-label-bottom">SISTEMA</p>
        <nav>
          <button className="nav-item" onClick={() => setActive("Auditoria")}><BookOpen size={18} /><span>Auditoria</span></button>
          <button className="nav-item" onClick={() => setActive("Configurações")}><Settings size={18} /><span>Configurações</span></button>
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-profile" onClick={() => setShowUserMenu((visible) => !visible)}>
            <div className="avatar">{getInitials(profile.name)}</div>
            <div><strong>{profile.name}</strong><span>{profile.role}</span></div>
          </button>
          <button aria-label="Notificações"><Bell size={17} /></button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="breadcrumbs"><span>Central</span><span>/</span><strong>{active}</strong></div>
          <div className="topbar-actions">
            <label className="search search-global"><Search size={17} /><input placeholder="Pesquisar na central..." value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label>
            <button className="icon-button" aria-label="Notificações"><Bell size={19} /><i /></button>
            <div className="user-menu-wrap">
              <button className="avatar avatar-button" aria-label="Abrir menu do usuário" aria-expanded={showUserMenu} onClick={() => setShowUserMenu((visible) => !visible)}>{getInitials(profile.name)}</button>
              {showUserMenu && <div className="user-menu">
                <div className="user-menu-header"><div className="avatar">{getInitials(profile.name)}</div><div><strong>{profile.name}</strong><span>{profile.email || "Perfil conectado"}</span></div></div>
                <div className="user-menu-role"><UserRound size={15} /> <span>Perfil: <strong>{profile.role}</strong></span></div>
                <button className="user-menu-item" onClick={() => router.push("/profile")}><UserRound size={16} /> Meu perfil</button>
                <button className="user-menu-item logout-item" onClick={() => void handleLogout()}><LogOut size={16} /> Sair do sistema</button>
              </div>}
            </div>
          </div>
        </header>

        <div className="page">
          <div className="page-heading">
            <div><p className="eyebrow">DOMINGO, 13 DE SETEMBRO DE 2026</p><h1>Bom dia, Delegado Almeida</h1><p className="muted">Acompanhe a atividade da sua unidade e o andamento das investigações.</p></div>
            <button className="primary-button" onClick={() => setShowModal(true)}><Plus size={18} /> Novo inquérito</button>
          </div>

          <div className="metrics">
            <div className="metric-card"><div className="metric-icon purple"><FileSearch size={19} /></div><span>Inquéritos ativos</span><strong>12</strong><small className="positive">↑ 2 este mês</small></div>
            <div className="metric-card"><div className="metric-icon amber"><ClipboardList size={19} /></div><span>Diligências pendentes</span><strong>08</strong><small className="warning">3 vencem hoje</small></div>
            <div className="metric-card"><div className="metric-icon blue"><Users size={19} /></div><span>Pessoas cadastradas</span><strong>1.284</strong><small className="positive">↑ 48 este mês</small></div>
            <div className="metric-card"><div className="metric-icon green"><Network size={19} /></div><span>Conexões mapeadas</span><strong>3.642</strong><small className="positive">↑ 8,4% este mês</small></div>
          </div>

          <div className="dashboard-grid">
            <section className="panel investigations-panel">
              <div className="panel-heading"><div><h2>Inquéritos recentes</h2><p>Últimas atualizações da sua unidade</p></div><button className="text-button">Ver todos <span>→</span></button></div>
              <div className="table-wrap"><table><thead><tr><th>INQUÉRITO</th><th>STATUS</th><th>PRIORIDADE</th><th>ATUALIZAÇÃO</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><strong>{item.id}</strong><span>{item.title}</span><small>{item.unit}</small></td><td><StatusBadge status={item.status} /></td><td><span className={`priority priority-${item.priority.toLowerCase()}`}><i />{item.priority}</span></td><td className="muted">{item.updated}</td><td><button className="more-button">•••</button></td></tr>)}</tbody></table></div>
            </section>
            <section className="panel activity-panel"><div className="panel-heading"><div><h2>Atividade recente</h2><p>Histórico da unidade</p></div><button className="more-button">•••</button></div><div className="activity-list"><div><span className="activity-dot purple-dot" /><p><strong>Nova evidência adicionada</strong><span>Foto - Galpão 14 foi vinculada ao <b>IP-2026-000184</b></span><small>há 12 minutos · Inspetor Silva</small></p></div><div><span className="activity-dot blue-dot" /><p><strong>Investigado relacionado</strong><span>Michael Thompson foi adicionado como investigado</span><small>há 38 minutos · Investigador Costa</small></p></div><div><span className="activity-dot amber-dot" /><p><strong>Diligência concluída</strong><span>Levantamento de câmeras - Mirror Park</span><small>há 2 horas · Agente Ramos</small></p></div><div><span className="activity-dot green-dot" /><p><strong>Inquérito arquivado</strong><span>IP-2026-000142 foi concluído e arquivado</span><small>ontem · Delegado Almeida</small></p></div></div></section>
          </div>

          <section className="panel quick-panel"><div><div className="quick-icon"><Search size={22} /></div><div><h2>Central de inteligência</h2><p>Pesquise pessoas, veículos, organizações, locais e qualquer entidade da base.</p></div></div><label className="search intelligence-search"><Search size={17} /><input placeholder="Buscar por nome, placa, telefone ou identificador..." /><button>Pesquisar</button></label></section>
        </div>
      </section>
      {showModal && <div className="modal-backdrop" onClick={() => setShowModal(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button><p className="eyebrow">NOVO REGISTRO</p><h2>Abrir inquérito</h2><p className="muted">O formulário completo será conectado ao Supabase na próxima etapa.</p><label>Título ou objeto<input autoFocus placeholder="Ex.: Operação Linha Verde" /></label><label>Descrição inicial<textarea placeholder="Descreva a origem da investigação..." /></label><div className="modal-actions"><button className="secondary-button" onClick={() => setShowModal(false)}>Cancelar</button><button className="primary-button" onClick={() => setShowModal(false)}>Criar rascunho</button></div></div></div>}
    </main>
  );
}
