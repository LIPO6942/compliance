
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

  // GRC Engine Extensions
  processes?: string[];        // Relation many-to-many (IDs)
  risks?: string[];            // Relation many-to-many (IDs)
  controls?: string[];         // Relation many-to-many (IDs)
  grcWorkflowId?: string;      // Identifiant du processus lié (ex: processus-eer)
  grcNodeId?: string;          // Identifiant du noeud dans le diagramme Mermaid

  raci?: {
    responsible?: string;      // User ID (R)
    accountable?: string;      // User ID (A)
    consulted?: string[];      // User IDs (C)
    informed?: string[];       // User IDs (I)
  };

  frequency?: 'monthly' | 'quarterly' | 'annual' | 'one_time' | 'custom';
  kpi?: {
    name: string;
    target: string;
    unit: string;
    thresholdAlert?: number;
  };

  lastReviewDate?: string;
  nextReviewDate?: string;
  createdBy?: string;
  updatedAt?: string;
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
  source: "NewsAPI" | "GNews" | "MarketAux" | "Google News" | "CGA" | "JORT" | "GAFI" | "OFAC" | "UE" | "AML Intelligence" | "ComplyAdvantage" | "Autre";
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

export type WorkflowDomain = 'Conformité' | 'Commercial' | 'Sinistre' | 'Technique';

export interface MermaidWorkflow {
  id: string;
  name: string;
  workflowId: string; // e.g., 'eer', 'gel'
  domain?: WorkflowDomain; // Added for grouping
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

export interface AvailableUser {
  id: string;
  name: string;
  role: string;
  email?: string;
  createdAt: string;
}

export interface AvailableRole {
  id: string;
  name: string;
  color?: string; // Pour un rendu élégant dans le diagramme
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  description: string;
  date: Date;
  Icon: React.ComponentType<{ className?: string }>;
}

// Ecosystem Map Types
export type EcosystemNodeType = 'authority' | 'entity' | 'judicial' | 'service' | 'other';

export interface EcosystemNode {
  id: string;
  label: string;
  type: EcosystemNodeType;
  description?: string;
  category?: string;
  icon?: string; // Lucide icon name
  position: { x: number; y: number };
  data?: any;
}

export interface EcosystemEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
}

export interface EcosystemMap {
  id: string;
  name: string;
  section: string; // To link to a specific section (e.g., 'lab-cft')
  nodes: EcosystemNode[];
  edges: EcosystemEdge[];
  createdAt: string;
  updatedAt: string;
}
