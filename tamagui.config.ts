import { createTamagui } from "tamagui";
import { config } from "@tamagui/config/v3";

const tamaguiConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    light: {
      ...config.themes.light,
      background: "#f5f7fb",
      color: "#162033",
      primary: "#6557d8",
      primaryBackground: "#6557d8"
    }
  },
  tokens: {
    ...config.tokens,
    color: {
      ...config.tokens.color,
      brand: "#6557d8",
      brandSoft: "#efedff",
      ink: "#162033",
      muted: "#778197",
      line: "#e6eaf2"
    },
    radius: {
      ...config.tokens.radius,
      card: 16,
      control: 10
    }
  }
});

export type AppTamaguiConfig = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}

export default tamaguiConfig;
