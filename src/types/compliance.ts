
import type { LucideIcon } from 'lucide-react';

export interface ComplianceTask {
  id: string;
  name: string;
  description?: string;
  completed: boolean; // Ajout du champ completed
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
