"use client";

import {
  Archive,
  ArrowLeft,
  BookOpen,
  Car,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Network,
  Phone,
  Settings,
  Shield,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSystemIdentity } from "./system-identity-provider";

const items = [
  ["/", "Central", LayoutDashboard],
  ["/investigations", "Inquéritos", ClipboardList],
  ["/people", "Pessoas", Users],
  ["/vehicles", "Veículos", Car],
  ["/organizations", "Organizações", Shield],
  ["/locations", "Locais", MapPin],
  ["/phones", "Telefones", Phone],
  ["/evidences", "Evidências", Archive],
  ["/tasks", "Diligências", ClipboardCheck],
  ["/intelligence", "Inteligência", Network]
] as const;

export default function AppSidebar({ active }: { active: string }) {
  const router = useRouter();
  const identity = useSystemIdentity();
  return (
    <aside className="sidebar">
      <div className="brand">{identity.logo_url ? <img className="brand-logo" src={identity.logo_url} alt="" /> : <div className="brand-mark" style={{ background: identity.primary_color }}><Shield size={21} /></div>}<div><strong>{identity.system_name}</strong><span>{identity.slug}</span></div></div>
      <p className="nav-label">NAVEGAÇÃO</p>
      <nav>
        {items.map(([href, label, Icon]) => <button className={`nav-item ${active === label ? "active" : ""}`} key={href} onClick={() => router.push(href)}><Icon size={18} /><span>{label}</span></button>)}
      </nav>
      <p className="nav-label nav-label-bottom">SISTEMA</p>
      <nav>
        <button className={`nav-item ${active === "Auditoria" ? "active" : ""}`} onClick={() => router.push("/audit")}><BookOpen size={18} /><span>Auditoria</span></button>
        <button className={`nav-item ${active === "Configurações" ? "active" : ""}`} onClick={() => router.push("/settings")}><Settings size={18} /><span>Configurações</span></button>
      </nav>
      <button className="nav-item sidebar-back" onClick={() => router.push("/")}><ArrowLeft size={18} /><span>Voltar para central</span></button>
    </aside>
  );
}
