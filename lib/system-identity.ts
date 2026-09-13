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
