
import type { LucideIcon } from 'lucide-react';

export interface ComplianceTask {
  id: string;
  name: string;
  description?: string;
  completed: boolean;
  deadline?: string; // ISO date string
  documentIds?: string[];
  flow_type?: 'start' | 'process' | 'decision' | 'action' | 'alert' | 'urgent' | 'end';
  branches?: Array<{
    label: string;
    tasks: ComplianceTask[];
  }>;
}

export interface ComplianceSubCategory {
  id: string;
  name: string;
  icon?: string;
  tasks: ComplianceTask[];
}

export interface ComplianceCategory {
  id: string;
  name: string;
  icon: string;
  subCategories: ComplianceSubCategory[];
}

// Document Types
export type DocumentStatus = "Validé" | "En Révision" | "Archivé" | "Obsolète";
export type DocumentType = string;

export interface DocumentTypeInfo {
  id: string;
  label: string;
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  version: string;
  status: DocumentStatus;
  lastUpdated: string;
  owner: string;
  tags?: string[];
  url?: string;
}

// Regulatory Alert Types (Previously IdentifiedRegulation)
export type AlertStatus = "Nouveau" | "En cours d'analyse" | "Traité" | "Archivé" | "Sans impact";
export type AlertCriticality = "Haute" | "Moyenne" | "Basse";
export type AlertType = "Nouvelle loi" | "Modification réglementaire" | "Alerte urgente" | "Risque Interne" | "Autre";

export interface IdentifiedRegulation {
  id: string;
  publicationDate: string;
  source: string;
  type: AlertType;
  summary: string;
  fullText: string;
  status: AlertStatus;
  criticality: AlertCriticality;
  deadline?: string;
  affectedDepartments?: string[];
  requiredActions?: string;
  analysisNotes?: string;
  keywords: string[];
  aiAnalysis?: Record<string, string[]>;
  sourceRiskId?: string; // Added to link alert to a risk
}

export interface CompletionCriterion {
  id: string;
  text: string;
  isCompleted: boolean;
}

// Training Registry Item
export interface TrainingRegistryItem {
  id: string;
  title: string;
  objective: string;
  duration: string;
  support: string;
  lastUpdated: string; // ISO date string
  completionCriteria: CompletionCriterion[];
  progress?: number;
  successRate?: number;
}

// Upcoming Training Session
export type UpcomingSessionType = "Obligatoire" | "Recommandée";
export interface UpcomingSession {
  id: string;
  title: string;
  date: string; // ISO date string or formatted string
  type: UpcomingSessionType;
  department: string;
  logisticsConfirmed?: boolean;
  materialsPrepared?: boolean;
  invitationsSent?: boolean;
  progress?: number;
  isCompleted?: boolean;
  participants?: number;
  totalInvitees?: number;
}

// Sensitization Campaign
export type SensitizationCampaignStatus = "En cours" | "Planifiée" | "Terminée";
export interface SensitizationCampaign {
  id: string;
  name: string;
  status: SensitizationCampaignStatus;
  launchDate: string; // ISO date string or formatted string
  target: string;
  completionCriteria: CompletionCriterion[];
  progress?: number;
}

// Risk Mapping Types
export type RiskLikelihood = "Faible" | "Modérée" | "Élevée" | "Très élevée";
export type RiskImpact = "Faible" | "Modéré" | "Élevé" | "Très élevé";
export type RiskLevel = "Faible" | "Modéré" | "Élevé" | "Très élevé";
export type RiskCategory = "Clients" | "Produits et Services" | "Pays et Zones Géographiques" | "Canaux de Distribution";

export interface RiskMappingItem {
  id: string;
  department: string;
  category: RiskCategory;
  regulatoryContent?: string; // Keep for backward compatibility of mock data
  documentIds?: string[];
  riskDescription: string;
  likelihood: RiskLikelihood;
  impact: RiskImpact;
  riskLevel: RiskLevel;
  expectedAction: string;
  owner: string;
  lastUpdated: string;
}

export interface CustomKeyword {
  id: string;
  label: string;
}

export interface NewsItem {
  id: string;
  title: string;
  date: string; // ISO Date String
  source: "NewsAPI" | "GNews" | "MarketAux" | "Google News" | "CGA" | "JORT" | "GAFI" | "OFAC" | "UE" | "Autre";
  description: string;
  url?: string;
  imageUrl?: string;
}

// Mermaid Workflow Types
export interface WorkflowVersion {
  id: string;
  mermaidCode: string;
  version: number;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface MermaidWorkflow {
  id: string;
  name: string;
  workflowId: string; // e.g., 'eer', 'gel'
  activeVersionId?: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export type WorkflowTaskStatus = "En attente" | "En cours" | "Terminé";

export interface WorkflowTask {
  id: string;
  workflowId: string;
  nodeId: string; // ID du noeud dans le diagramme Mermaid
  taskName: string;
  responsibleUserId: string;
  responsibleUserName?: string;
  roleRequired: string;
  status: WorkflowTaskStatus;
  assignedAt: string;
  completedAt?: string;
}

export interface AuditLog {
  id: string;
  taskId: string;
  workflowId: string;
  action: string; // e.g., "Assigned", "Status Update"
  performedByUserId: string;
  performedByUserName?: string;
  timestamp: string;
  details?: string;
}
