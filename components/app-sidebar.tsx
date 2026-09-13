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
  return (
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Shield size={21} /></div><div><strong>MRP</strong><span>INTELLIGENCE</span></div></div>
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
