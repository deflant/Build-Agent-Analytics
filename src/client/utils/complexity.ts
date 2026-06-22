import type { AppComposition } from "../services/api.ts";

/**
 * Keys of AppComposition that represent countable component arrays.
 * Used for iteration in complexity/effort calculations.
 */
export type CompositionKey = keyof AppComposition;

export const ALL_COMPOSITION_KEYS: CompositionKey[] = [
  "tables",
  "businessRules",
  "scriptIncludes",
  "scheduledJobs",
  "fixScripts",
  "clientScripts",
  "uiActions",
  "uiPolicies",
  "acls",
  "roles",
  "flows",
  "notifications",
  "events",
  "dataPolicies",
  "uiPages",
  "workspaces",
  "portals",
  "widgets",
  "appMenus",
  "modules",
  "restOperations",
  "properties",
  "catalogItems",
  "atfTests",
];

// ─── Labels & Icons ────────────────────────────────────────────────────────────

export const COMPONENT_LABELS: Record<CompositionKey, string> = {
  tables: "Tables",
  businessRules: "Business Rules",
  scriptIncludes: "Script Includes",
  scheduledJobs: "Scheduled Jobs",
  fixScripts: "Fix Scripts",
  clientScripts: "Client Scripts",
  uiActions: "UI Actions",
  uiPolicies: "UI Policies",
  acls: "ACLs",
  roles: "Roles",
  flows: "Flows",
  notifications: "Notifications",
  events: "Events",
  dataPolicies: "Data Policies",
  uiPages: "UI Pages",
  workspaces: "Workspaces",
  portals: "Portals",
  widgets: "Widgets",
  appMenus: "App Menus",
  modules: "Modules",
  restOperations: "REST Operations",
  properties: "Properties",
  catalogItems: "Catalog Items",
  atfTests: "ATF Tests",
};

export const COMPONENT_ICONS: Record<CompositionKey, string> = {
  tables: "🗃️",
  businessRules: "📜",
  scriptIncludes: "📦",
  scheduledJobs: "⏰",
  fixScripts: "🔧",
  clientScripts: "💻",
  uiActions: "🖱️",
  uiPolicies: "📋",
  acls: "🔒",
  roles: "👤",
  flows: "⚡",
  notifications: "📧",
  events: "📡",
  dataPolicies: "📐",
  uiPages: "📄",
  workspaces: "🖥️",
  portals: "🌐",
  widgets: "🧩",
  appMenus: "📂",
  modules: "📁",
  restOperations: "🔌",
  properties: "⚙️",
  catalogItems: "🛒",
  atfTests: "🧪",
};

/**
 * Composition categories for grouped display in the UI.
 */
export interface CompositionCategory {
  label: string;
  keys: CompositionKey[];
}

export const COMPOSITION_CATEGORIES: CompositionCategory[] = [
  { label: "Data Model", keys: ["tables"] },
  { label: "Server-Side Logic", keys: ["businessRules", "scriptIncludes", "scheduledJobs", "fixScripts"] },
  { label: "Client-Side Logic", keys: ["clientScripts", "uiActions", "uiPolicies"] },
  { label: "Security", keys: ["acls", "roles"] },
  { label: "Automation", keys: ["flows", "notifications", "events", "dataPolicies"] },
  { label: "User Interface", keys: ["uiPages", "workspaces", "portals", "widgets", "appMenus", "modules"] },
  { label: "Integration", keys: ["restOperations"] },
  { label: "Configuration", keys: ["properties"] },
  { label: "Service Catalog", keys: ["catalogItems"] },
  { label: "Testing", keys: ["atfTests"] },
];

// ─── Complexity Weights ────────────────────────────────────────────────────────

export type ComplexityWeights = Record<CompositionKey, number>;

export const DEFAULT_WEIGHTS: ComplexityWeights = {
  tables: 3,
  businessRules: 2,
  scriptIncludes: 3,
  scheduledJobs: 4,
  fixScripts: 1,
  clientScripts: 2,
  uiActions: 1,
  uiPolicies: 1,
  acls: 1,
  roles: 1,
  flows: 5,
  notifications: 2,
  events: 1,
  dataPolicies: 1,
  uiPages: 4,
  workspaces: 8,
  portals: 6,
  widgets: 3,
  appMenus: 1,
  modules: 1,
  restOperations: 4,
  properties: 1,
  catalogItems: 5,
  atfTests: 2,
};

export function calculateComplexity(composition: AppComposition, weights: ComplexityWeights): number {
  let total = 0;
  for (const key of ALL_COMPOSITION_KEYS) {
    total += composition[key].length * (weights[key] || 0);
  }
  return total;
}

export function complexityLabel(score: number): { label: string; color: string } {
  if (score <= 10) return { label: "Simple", color: "#10b981" };
  if (score <= 25) return { label: "Moderate", color: "#f59e0b" };
  if (score <= 50) return { label: "Complex", color: "#f97316" };
  return { label: "Enterprise", color: "#dc2626" };
}

// ─── Partner Hour Estimates ────────────────────────────────────────────────────

export type PartnerEstimates = Record<CompositionKey, number>;

export const DEFAULT_PARTNER_ESTIMATES: PartnerEstimates = {
  tables: 8,
  businessRules: 4,
  scriptIncludes: 6,
  scheduledJobs: 8,
  fixScripts: 2,
  clientScripts: 4,
  uiActions: 2,
  uiPolicies: 2,
  acls: 2,
  roles: 1,
  flows: 16,
  notifications: 4,
  events: 2,
  dataPolicies: 2,
  uiPages: 16,
  workspaces: 40,
  portals: 32,
  widgets: 12,
  appMenus: 2,
  modules: 1,
  restOperations: 8,
  properties: 1,
  catalogItems: 16,
  atfTests: 4,
};

export function calculateManualHours(composition: AppComposition, estimates: PartnerEstimates): number {
  let total = 0;
  for (const key of ALL_COMPOSITION_KEYS) {
    total += composition[key].length * (estimates[key] || 0);
  }
  return total;
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

/**
 * Merge saved (potentially partial) settings with defaults so that newly-added
 * keys get their default values while preserving user customizations.
 */
export function mergeWithDefaults<T extends Record<string, number>>(saved: Partial<T> | null, defaults: T): T {
  if (!saved) return { ...defaults };
  return { ...defaults, ...saved };
}

/**
 * Get the total component count from a composition.
 */
export function getTotalComponentCount(composition: AppComposition): number {
  let total = 0;
  for (const key of ALL_COMPOSITION_KEYS) {
    total += composition[key].length;
  }
  return total;
}
