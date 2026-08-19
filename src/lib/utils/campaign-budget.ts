import type { CampaignPlatform, FullCampaignPlan } from "@/lib/types";

export function calcPlatformTotal(platform: CampaignPlatform): number {
  return platform.budget ?? 0;
}

export function calcCampaignTotal(platforms: CampaignPlatform[]): number {
  return platforms.reduce((sum, p) => sum + calcPlatformTotal(p), 0);
}

export function calcCampaignPlanTotal(plan: FullCampaignPlan): number {
  return plan.campaigns.reduce(
    (sum, c) => sum + calcCampaignTotal(c.platforms),
    0
  );
}

export function formatSEK(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const PLATFORM_STATUS_LABELS: Record<CampaignPlatform["status"], string> = {
  inaktiv: "Inaktiv",
  schemalagd: "Schemalagd",
  aktiv: "Aktiv",
  klar: "Klar",
};

export const PLATFORM_STATUS_COLORS: Record<CampaignPlatform["status"], string> = {
  inaktiv: "#AAAAAA",
  schemalagd: "#f59e0b",
  aktiv: "#10b981",
  klar: "#6C6C6C",
};
