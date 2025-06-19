import type { LucideIcon } from 'lucide-react';

export interface ComplianceTask {
  id: string;
  name: string;
  description?: string; // Made description optional
}

export interface ComplianceSubCategory {
  id: string;
  name: string;
  icon?: string; // Changed from LucideIcon to string (icon name)
  tasks: ComplianceTask[];
}

export interface ComplianceCategory {
  id: string;
  name: string;
  icon: string; // Changed from LucideIcon to string (icon name)
  subCategories: ComplianceSubCategory[];
}
