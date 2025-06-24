
import type { LucideIcon } from 'lucide-react';
import type { CategorizeRegulationOutput } from '@/ai/flows/regulatory-categorization';


export interface ComplianceTask {
  id: string;
  name: string;
  description?: string;
  completed: boolean;
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
export type DocumentType = "Politique" | "Procédure" | "Rapport" | "Support de Formation" | "Veille";

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  version: string;
  status: DocumentStatus;
  lastUpdated: string;
  owner: string;
  tags?: string[];
}

// Regulatory Alert Types (Previously IdentifiedRegulation)
export type AlertStatus = "Nouveau" | "En cours d'analyse" | "Traité" | "Archivé" | "Sans impact";
export type AlertCriticality = "Haute" | "Moyenne" | "Basse";
export type AlertType = "Nouvelle loi" | "Modification réglementaire" | "Alerte urgente" | "Autre";

export interface IdentifiedRegulation {
  id: string;
  publicationDate: string; // Renamed from timestamp
  source: string;
  type: AlertType;
  summary: string; // Renamed from regulationTextSummary
  fullText: string; // Renamed from regulationTextFull
  status: AlertStatus; // Renamed from status, using new type
  criticality: AlertCriticality;
  deadline?: string; // new
  affectedDepartments?: string[]; // new
  requiredActions?: string; // new
  analysisNotes?: string; // new
  // AI-related fields from previous structure
  aiInclusionDecision: {
    include: boolean;
    reason: string;
  };
  aiCategorizationSuggestions?: CategorizeRegulationOutput;
  aiKeywordsUsed: string;
}


// Training Registry Item
export interface TrainingRegistryItem {
  id: string;
  title: string;
  objective: string;
  duration: string;
  support: string;
  lastUpdated: string; // ISO date string
  contentReviewedRecently?: boolean;
  assessmentAvailable?: boolean;
  feedbackMechanismInPlace?: boolean;
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
  iconName: string; // Name of the lucide-react icon
  progress?: number; // Optional progress (0-100)

  // Criteria for LAB-FT campaign
  kycProceduresUpdated?: boolean;
  transactionMonitoringEnhanced?: boolean;
  staffTrainedOnRedFlags?: boolean;

  // Criteria for RGPD campaign
  dataMappingDone?: boolean;
  consentMechanismsReviewed?: boolean;
  dpiasConducted?: boolean;
}
