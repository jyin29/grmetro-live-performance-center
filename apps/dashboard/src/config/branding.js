import defaultLogoUrl from "../../../../assets/branding/grmetro-logo.png";

function setting(name, fallback) {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export const branding = Object.freeze({
  companyName: setting("VITE_COMPANY_NAME", "GRmetro Heating & Cooling"),
  applicationName: setting("VITE_APPLICATION_NAME", "Live Performance Center"),
  logoUrl: setting("VITE_COMPANY_LOGO_URL", defaultLogoUrl)
});
