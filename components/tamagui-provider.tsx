"use client";

import { TamaguiProvider } from "tamagui";
import config from "../tamagui.config";

export default function AppTamaguiProvider({ children }: { children: React.ReactNode }) {
  return <TamaguiProvider config={config} defaultTheme="light">{children}</TamaguiProvider>;
}
