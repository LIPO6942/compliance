export type TestStatus = "OK" | "KO" | "Non encore testé";
export type AnomalyPriority = "CRITIQUE" | "HAUTE" | "MOYENNE" | "BASSE";
export type AnomalyStatus = "OUVERTE" | "RESOLUE" | "EN COURS";

export interface TestCase {
  id: string;
  module: string;
  title: string;
  steps: string;
  expectedResult: string;
  status: TestStatus;
  linkedAnomaly?: string;
  comment?: string;
}

export interface Anomaly {
  id: string;
  module: string;
  description: string;
  businessImpact: string;
  priority: AnomalyPriority;
  linkedTest: string;
  status?: AnomalyStatus;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionComment?: string;
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
  progressRate: string;
  executionRate: string;
}
