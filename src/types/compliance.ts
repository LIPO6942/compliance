import type { LucideIcon } from 'lucide-react';

export interface ComplianceTask {
  id: string;
  name: string;
  description?: string;
}

export interface ComplianceSubCategory {
  id: string;
  name: string;
  tasks: ComplianceTask[];
  icon?: LucideIcon;
}

export interface ComplianceCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  subCategories: ComplianceSubCategory[];
}
