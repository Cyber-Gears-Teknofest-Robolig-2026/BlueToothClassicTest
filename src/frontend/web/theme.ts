/**
 * TASARIM TOKEN'LARI (PALETTE)
 * --------------------------------------------------------------------------
 * Ekranlardaki stiller bu paleti referans alabilir. Başka bir projeye taşırken
 * yalnızca bu dosyadaki değerleri değiştirerek tüm arayüzün rengini/aralıklarını
 * tek noktadan uyarlayabilirsin.
 *
 * Not: Mevcut ekran stilleri (her ekranın `styles.ts` dosyası) doğrudan hex
 * değerler de içerir; kademeli olarak buradaki token'lara taşıyabilirsin.
 */
export const colors = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#F1F5F9",

  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  textMuted: "#CBD5E1",

  primary: "#0284C7",
  primarySoft: "#E0F2FE",

  success: "#10B981",
  successSoft: "#DCFCE7",

  warning: "#F59E0B",
  danger: "#EF4444",
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 25,
} as const;

export type AppColors = typeof colors;
