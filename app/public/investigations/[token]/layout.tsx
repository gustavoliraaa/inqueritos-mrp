import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { getPublicImageUrl, getSiteUrl, getSystemIdentityServer } from "../../../../lib/system-identity-server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const identity = await getSystemIdentityServer();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let title = identity.system_name;
  let description = identity.share_description;

  if (url && key) {
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: share } = await supabase.from("investigation_shares").select("investigation_id").eq("token", params.token).is("revoked_at", null).maybeSingle();
    if (share) {
      const { data: investigation } = await supabase.from("investigations").select("identifier, title, description").eq("id", share.investigation_id).maybeSingle();
      if (investigation) {
        title = `${investigation.identifier} · ${investigation.title}`;
        description = investigation.description || identity.share_description;
      }
    }
  }

  const image = getPublicImageUrl(identity.share_image_url || identity.logo_url);
  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    openGraph: { title, description, type: "article", ...(image ? { images: [image] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) }
  };
}

export default function PublicInvestigationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
