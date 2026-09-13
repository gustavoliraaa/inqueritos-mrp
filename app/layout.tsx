import type { Metadata } from "next";
import "./globals.css";
import "./modern.css";
import AppTamaguiProvider from "../components/tamagui-provider";
import SystemIdentityProvider from "../components/system-identity-provider";
import { getPublicImageUrl, getSiteUrl, getSystemIdentityServer } from "../lib/system-identity-server";

export async function generateMetadata(): Promise<Metadata> {
  const identity = await getSystemIdentityServer();
  const title = identity.browser_name || identity.system_name;
  const description = identity.share_description || "Sistema de investigação e inteligência.";
  const image = getPublicImageUrl(identity.share_image_url || identity.logo_url);
  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    openGraph: { title, description, type: "website", ...(image ? { images: [image] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) }
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><AppTamaguiProvider><SystemIdentityProvider>{children}</SystemIdentityProvider></AppTamaguiProvider></body>
    </html>
  );
}
