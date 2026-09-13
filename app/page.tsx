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
  ClipboardCheck,
  UserRound,
  Users,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase";
import { useSystemIdentity } from "../components/system-identity-provider";

type CaseStatus = "Em investigação" | "Aguardando diligência" | "Em análise" | "Concluído";

type Investigation = {
  id: string;
  title: string;
  unit: string;
  status: CaseStatus;
  priority: "Alta" | "Média" | "Baixa";
  updated: string;
};

type SearchResult = { id: string; label: string; subtitle: string; route: string };
type Notification = { id: string; action: string; entity_type: string; created_at: string };

const investigations: Investigation[] = [];

const navItems = [
  { label: "Central", icon: LayoutDashboard },
  { label: "Inquéritos", icon: ClipboardList },
  { label: "Pessoas", icon: Users },
  { label: "Veículos", icon: Car },
  { label: "Organizações", icon: Shield },
  { label: "Locais", icon: MapPin },
  { label: "Telefones", icon: Phone },
  { label: "Evidências", icon: Archive },
  { label: "Diligências", icon: ClipboardCheck },
  { label: "Inteligência", icon: Network }
];

function StatusBadge({ status }: { status: CaseStatus }) {
  return <span className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>;
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "US";
}

export default function HomePage() {
  const identity = useSystemIdentity();
  const router = useRouter();
  const [active, setActive] = useState("Central");
  const [showModal, setShowModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState({ name: "Usuário", role: "Agente", email: "", unit: "Unidade não definida" });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
        .select("full_name, role, unit")
        .eq("id", user.id)
        .maybeSingle();

      setProfile({
        name: profileData?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário",
        role: profileData?.role ? profileData.role.replaceAll("_", " ") : "Agente",
        email: user.email || "",
        unit: profileData?.unit || "Unidade não definida"
      });

      const { data: auditData } = await client.from("audit_logs").select("id, action, entity_type, created_at").eq("actor_id", user.id).order("created_at", { ascending: false }).limit(5);
      setNotifications(auditData || []);
    }

    void loadProfile();
  }, []);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const client = getSupabaseBrowserClient();
      if (!client) return;
      const pattern = `%${normalizedQuery}%`;
      const [investigationsRes, peopleRes, entitiesRes] = await Promise.all([
        client.from("investigations").select("id, identifier, title").or(`identifier.ilike.${pattern},title.ilike.${pattern}`).limit(5),
        client.from("people").select("id, identifier, name").or(`identifier.ilike.${pattern},name.ilike.${pattern}`).limit(5),
        client.from("entities").select("id, identifier, name, entity_type").or(`identifier.ilike.${pattern},name.ilike.${pattern}`).limit(5)
      ]);
      setSearchResults([
        ...(investigationsRes.data || []).map((item) => ({ id: item.id, label: item.identifier, subtitle: item.title, route: `/investigations/${item.id}` })),
        ...(peopleRes.data || []).map((item) => ({ id: item.id, label: item.identifier, subtitle: item.name, route: `/people/${item.id}` })),
        ...(entitiesRes.data || []).map((item) => ({ id: item.id, label: item.identifier, subtitle: `${item.name} · ${item.entity_type}`, route: `/intelligence?query=${encodeURIComponent(item.identifier)}` }))
      ]);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>(".search-global input")?.focus();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function selectSearchResult(result: SearchResult) {
    setQuery("");
    setSearchResults([]);
    router.push(result.route);
  }

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/auth/login");
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          {identity.logo_url ? <img className="brand-logo" src={identity.logo_url} alt="" /> : <div className="brand-mark" style={{ background: identity.primary_color }}><Shield size={21} /></div>}
          <div><strong>{identity.system_name}</strong><span>{identity.slug}</span></div>
        </div>
        <button className="workspace-switcher" onClick={() => setShowWorkspaceMenu((visible) => !visible)} aria-expanded={showWorkspaceMenu}>
          <div className="avatar avatar-small">{getInitials(profile.name)}</div>
          <div><strong>{profile.unit}</strong><span>{profile.name}</span></div>
          <ChevronDown size={15} />
        </button>
        {showWorkspaceMenu && <div className="workspace-menu"><strong>Unidade atual</strong><span>{profile.unit}</span><button onClick={() => router.push("/profile")}>Editar meu perfil</button><button onClick={() => router.push("/settings")}>Configurações</button></div>}
        <p className="nav-label">NAVEGAÇÃO</p>
        <nav>
          {navItems.map(({ label, icon: Icon }) => (
            <button className={`nav-item ${active === label ? "active" : ""}`} key={label} onClick={() => label === "Central" ? setActive(label) : label === "Inquéritos" ? router.push("/investigations") : label === "Pessoas" ? router.push("/people") : label === "Veículos" ? router.push("/vehicles") : label === "Organizações" ? router.push("/organizations") : label === "Locais" ? router.push("/locations") : label === "Telefones" ? router.push("/phones") : label === "Evidências" ? router.push("/evidences") : label === "Diligências" ? router.push("/tasks") : label === "Inteligência" ? router.push("/intelligence") : setActive(label)}>
              <Icon size={18} /><span>{label}</span>
              {label === "Inquéritos" && <b>0</b>}
            </button>
          ))}
        </nav>
        <p className="nav-label nav-label-bottom">SISTEMA</p>
        <nav>
          <button className="nav-item" onClick={() => router.push("/audit")}><BookOpen size={18} /><span>Auditoria</span></button>
          <button className="nav-item" onClick={() => router.push("/settings")}><Settings size={18} /><span>Configurações</span></button>
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-profile" onClick={() => setShowUserMenu((visible) => !visible)}>
            <div className="avatar">{getInitials(profile.name)}</div>
            <div><strong>{profile.name}</strong><span>{profile.role}</span></div>
          </button>
          <button aria-label="Notificações" onClick={() => setShowNotifications((visible) => !visible)}><Bell size={17} />{notifications.length > 0 && <i />}</button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="breadcrumbs"><span>Central</span><span>/</span><strong>{active}</strong></div>
          <div className="topbar-actions">
            <div className="global-search-wrap"><label className="search search-global"><Search size={17} /><input placeholder="Pesquisar na central..." value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label>{searchResults.length > 0 && <div className="global-search-results">{searchResults.map((result) => <button key={`${result.route}-${result.id}`} onClick={() => selectSearchResult(result)}><strong>{result.label}</strong><span>{result.subtitle}</span></button>)}</div>}</div>
            <div className="notification-wrap"><button className="icon-button" aria-label="Notificações" onClick={() => setShowNotifications((visible) => !visible)}><Bell size={19} />{notifications.length > 0 && <i />}</button>{showNotifications && <div className="notification-menu"><div className="panel-heading"><strong>Notificações</strong><small>{notifications.length} recentes</small></div>{notifications.length === 0 ? <p className="muted">Nenhuma notificação.</p> : notifications.map((item) => <div className="notification-item" key={item.id}><strong>{item.action}</strong><span>{item.entity_type} · {new Date(item.created_at).toLocaleString("pt-BR")}</span></div>)}</div>}</div>
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
            <div><p className="eyebrow">CENTRAL OPERACIONAL</p><h1>Olá, {profile.name}</h1><p className="muted">Acompanhe a atividade da sua unidade e o andamento das investigações.</p></div>
            <button className="primary-button" onClick={() => setShowModal(true)}><Plus size={18} /> Novo inquérito</button>
          </div>

          <div className="metrics">
            <div className="metric-card"><div className="metric-icon purple"><FileSearch size={19} /></div><span>Inquéritos ativos</span><strong>0</strong><small>Sem registros</small></div>
            <div className="metric-card"><div className="metric-icon amber"><ClipboardList size={19} /></div><span>Diligências pendentes</span><strong>0</strong><small>Sem registros</small></div>
            <div className="metric-card"><div className="metric-icon blue"><Users size={19} /></div><span>Pessoas cadastradas</span><strong>0</strong><small>Sem registros</small></div>
            <div className="metric-card"><div className="metric-icon green"><Network size={19} /></div><span>Conexões mapeadas</span><strong>0</strong><small>Sem registros</small></div>
          </div>

          <div className="dashboard-grid">
            <section className="panel investigations-panel">
              <div className="panel-heading"><div><h2>Inquéritos recentes</h2><p>Últimas atualizações da sua unidade</p></div><button className="text-button">Ver todos <span>→</span></button></div>
              <div className="table-wrap">{filtered.length === 0 ? <div className="empty-state"><strong>Nenhum inquérito cadastrado</strong><span>Os registros criados pela sua unidade aparecerão aqui.</span></div> : <table><thead><tr><th>INQUÉRITO</th><th>STATUS</th><th>PRIORIDADE</th><th>ATUALIZAÇÃO</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><strong>{item.id}</strong><span>{item.title}</span><small>{item.unit}</small></td><td><StatusBadge status={item.status} /></td><td><span className={`priority priority-${item.priority.toLowerCase()}`}><i />{item.priority}</span></td><td className="muted">{item.updated}</td><td><button className="more-button">•••</button></td></tr>)}</tbody></table>}</div>
            </section>
            <section className="panel activity-panel"><div className="panel-heading"><div><h2>Atividade recente</h2><p>Histórico da unidade</p></div></div><div className="empty-state"><strong>Nenhuma atividade registrada</strong><span>As alterações realizadas no sistema aparecerão aqui.</span></div></section>
          </div>

          <section className="panel quick-panel"><div><div className="quick-icon"><Search size={22} /></div><div><h2>Central de inteligência</h2><p>Pesquise pessoas, veículos, organizações, locais e qualquer entidade da base.</p></div></div><label className="search intelligence-search"><Search size={17} /><input placeholder="Buscar por nome, placa, telefone ou identificador..." /><button>Pesquisar</button></label></section>
        </div>
      </section>
      {showModal && <div className="modal-backdrop" onClick={() => setShowModal(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button><p className="eyebrow">NOVO REGISTRO</p><h2>Abrir inquérito</h2><p className="muted">O formulário completo será conectado ao Supabase na próxima etapa.</p><label>Título ou objeto<input autoFocus placeholder="Ex.: Operação Linha Verde" /></label><label>Descrição inicial<textarea placeholder="Descreva a origem da investigação..." /></label><div className="modal-actions"><button className="secondary-button" onClick={() => setShowModal(false)}>Cancelar</button><button className="primary-button" onClick={() => setShowModal(false)}>Criar rascunho</button></div></div></div>}
    </main>
  );
}
