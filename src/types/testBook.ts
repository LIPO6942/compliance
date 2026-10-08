export type TestStatus = "OK" | "KO" | "Non encore testé";
export type AnomalyPriority = "CRITIQUE" | "HAUTE" | "MOYENNE" | "BASSE";
export type AnomalyStatus = "OUVERTE" | "RESOLUE" | "EN COURS" | "REOUVERTE";

export interface AuditEntry {
  timestamp: string;   // ISO date string
  author: string;      // who made the change
  action: string;      // "Création" | "Modification" | "Changement de statut" | "Résolution" | "Réouverture" | etc.
  changes: string;     // human-readable description of what changed
  remark?: string;     // optional free comment entered by the user
}

export interface TestCase {
  id: string;
  module: string;
  title: string;
  steps: string;
  expectedResult: string;
  status: TestStatus;
  linkedAnomaly?: string;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
  auditHistory?: AuditEntry[];
}

export interface Anomaly {
  id: string;
  module: string;
  description: string;
  businessImpact: string;
  priority: AnomalyPriority;
  linkedTest: string;
  status?: AnomalyStatus;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionComment?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenCount?: number;
  auditHistory?: AuditEntry[];
}

export function isAnomalyReopened(ano?: Anomaly | null): boolean {
  if (!ano) return false;
  if (ano.status === "REOUVERTE") return true;
  if (ano.reopenedAt && ano.status !== "RESOLUE") return true;
  if ((ano.reopenCount ?? 0) > 0 && ano.status !== "RESOLUE") return true;
  if (
    ano.status !== "RESOLUE" &&
    ano.auditHistory &&
    ano.auditHistory.some((entry) => entry.action === "Réouverture" || entry.changes?.toLowerCase().includes("réouverture"))
  ) {
    return true;
  }
  return false;
}

export interface TestBookMetadata {
  project: string;
  editor: string;
  url: string;
  environment: string;
  generationDate: string;
  tester: string;
}

export interface TestBookStats {
  total: number;
  okCount: number;
  koCount: number;
  pendingCount: number;
  criticalAnomalies: number;
  highAnomalies: number;
  openAnomaliesCount: number;
  resolvedAnomaliesCount: number;
  reopenedAnomaliesCount?: number;
  progressRate: string;
  executionRate: string;
}
