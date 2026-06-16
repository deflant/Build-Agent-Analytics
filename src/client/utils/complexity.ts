import type { AppComposition } from "../services/api.ts";

export interface ComplexityWeights {
  tables: number;
  uiPages: number;
  workspaces: number;
  portals: number;
  widgets: number;
  flows: number;
}

export const DEFAULT_WEIGHTS: ComplexityWeights = {
  tables: 3,
  uiPages: 4,
  workspaces: 8,
  portals: 6,
  widgets: 3,
  flows: 5,
};

export function calculateComplexity(composition: AppComposition, weights: ComplexityWeights): number {
  return (
    composition.tables.length * weights.tables +
    composition.uiPages.length * weights.uiPages +
    composition.workspaces.length * weights.workspaces +
    composition.portals.length * weights.portals +
    composition.widgets.length * weights.widgets +
    composition.flows.length * weights.flows
  );
}

export function complexityLabel(score: number): { label: string; color: string } {
  if (score <= 10) return { label: "Simple", color: "#10b981" };
  if (score <= 25) return { label: "Moderate", color: "#f59e0b" };
  if (score <= 50) return { label: "Complex", color: "#f97316" };
  return { label: "Enterprise", color: "#dc2626" };
}

export interface PartnerEstimates {
  tables: number;
  uiPages: number;
  workspaces: number;
  portals: number;
  widgets: number;
  flows: number;
}

export const DEFAULT_PARTNER_ESTIMATES: PartnerEstimates = {
  tables: 8,
  uiPages: 16,
  workspaces: 40,
  portals: 32,
  widgets: 12,
  flows: 16,
};

export function calculateManualHours(composition: AppComposition, estimates: PartnerEstimates): number {
  return (
    composition.tables.length * estimates.tables +
    composition.uiPages.length * estimates.uiPages +
    composition.workspaces.length * estimates.workspaces +
    composition.portals.length * estimates.portals +
    composition.widgets.length * estimates.widgets +
    composition.flows.length * estimates.flows
  );
}

export interface ROIResult {
  manualHours: number;
  buildAgentHours: number;
  savedHours: number;
  savingsPercent: number;
}

export function calculateROI(manualHours: number, buildAgentMinutes: number): ROIResult {
  const buildAgentHours = buildAgentMinutes / 60;
  const savedHours = manualHours - buildAgentHours;
  const savingsPercent = manualHours > 0 ? (savedHours / manualHours) * 100 : 0;
  return { manualHours, buildAgentHours, savedHours, savingsPercent };
}
