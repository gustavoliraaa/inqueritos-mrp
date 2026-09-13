import { createClient } from "@supabase/supabase-js";
import { defaultSystemIdentity, type SystemIdentity } from "./system-identity";

export async function getSystemIdentityServer(): Promise<SystemIdentity> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return defaultSystemIdentity;

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await supabase
    .from("system_identity")
    .select("system_name, logo_url, primary_color, secondary_color, accent_color, background_color, slug, browser_name, share_image_url, share_description")
    .eq("id", 1)
    .maybeSingle();

  return data
    ? { ...defaultSystemIdentity, ...data, logo_url: data.logo_url || "", share_image_url: data.share_image_url || "" }
    : defaultSystemIdentity;
}

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "inqueritos-mrp.vercel.app";
  return configuredUrl.startsWith("http") ? configuredUrl : `https://${configuredUrl}`;
}

export function getPublicImageUrl(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value, getSiteUrl());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}
