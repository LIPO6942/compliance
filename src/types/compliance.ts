
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
