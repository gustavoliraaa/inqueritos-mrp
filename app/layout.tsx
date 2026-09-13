import type { Metadata } from "next";
import "./globals.css";
import "./modern.css";
import AppTamaguiProvider from "../components/tamagui-provider";
import SystemIdentityProvider from "../components/system-identity-provider";

export const metadata: Metadata = {
  title: "MRP Intelligence",
  description: "Sistema de investigação e inteligência policial fictícia para GTA FiveM MRP"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><AppTamaguiProvider><SystemIdentityProvider>{children}</SystemIdentityProvider></AppTamaguiProvider></body>
    </html>
  );
}
