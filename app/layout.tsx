import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MRP Intelligence",
  description: "Sistema de investigação e inteligência policial fictícia para GTA FiveM MRP"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
