"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase";

export type SystemIdentity = {
  system_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  slug: string;
  browser_name: string;
  share_image_url: string;
  share_description: string;
};

export const defaultSystemIdentity: SystemIdentity = {
  system_name: "MRP Intelligence",
  logo_url: "",
  primary_color: "#6557d8",
  secondary_color: "#162033",
  accent_color: "#4294cc",
  background_color: "#f5f7fb",
  slug: "mrp-intelligence",
  browser_name: "MRP Intelligence",
  share_image_url: "",
  share_description: "Sistema de investigação e inteligência."
};

const IdentityContext = createContext<SystemIdentity>(defaultSystemIdentity);

export function useSystemIdentity() {
  return useContext(IdentityContext);
}

export default function SystemIdentityProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState(defaultSystemIdentity);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.from("system_identity").select("system_name, logo_url, primary_color, secondary_color, accent_color, background_color, slug, browser_name, share_image_url, share_description").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data) setIdentity((current) => ({ ...current, ...data, logo_url: data.logo_url || "", share_image_url: data.share_image_url || "" }));
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", identity.primary_color);
    root.style.setProperty("--brand-secondary", identity.secondary_color);
    root.style.setProperty("--brand-accent", identity.accent_color);
    root.style.setProperty("--brand-background", identity.background_color);
    document.title = identity.browser_name || identity.system_name;
  }, [identity]);

  return <IdentityContext.Provider value={identity}>{children}</IdentityContext.Provider>;
}
