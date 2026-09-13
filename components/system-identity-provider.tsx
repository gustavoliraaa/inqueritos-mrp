"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase";
import { defaultSystemIdentity, type SystemIdentity } from "../lib/system-identity";

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
