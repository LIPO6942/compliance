
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

// Identified Regulation for Alerts
export type IdentifiedRegulationStatus = 'Nouvelle' | 'Revue' | 'Archivée';

export interface IdentifiedRegulation {
  id: string;
  timestamp: string; // ISO date string when identified
  regulationTextFull: string; // Store the full text for reference
  regulationTextSummary: string; // A short summary or the first few lines
  inclusionDecision: {
    include: boolean;
    reason: string;
  };
  categorizationSuggestions?: CategorizeRegulationOutput;
  status: IdentifiedRegulationStatus;
  keywordsUsed: string;
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
