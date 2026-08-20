export type MemoPillar = "LAB_FT" | "CONFORMITE_REGLEMENTAIRE" | "AUDIT_CONTROLE" | "GENERAL";
export type MemoScope = "COLLABORATIVE" | "PRIVATE";
export type MemoPriority = "URGENT" | "ATTENTION" | "INFO";
export type MemoStatus = "ACTIVE" | "RESOLVED" | "ARCHIVED";

export interface MemoChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ComplianceMemo {
  id: string;
  title: string;
  content: string;
  pillar: MemoPillar;
  scope: MemoScope;
  priority: MemoPriority;
  status: MemoStatus;
  authorEmail: string;
  authorName: string;
  createdAt: string; // ISO string
  updatedAt?: string;
  associatedSectionHref: string;
  associatedSectionLabel: string;
  checklists?: MemoChecklistItem[];
  pinned?: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AppSectionOption {
  href: string;
  label: string;
  group: string;
}

export const APP_SECTIONS: AppSectionOption[] = [
  { href: "/dashboard", label: "Dashboard Général", group: "Pilotage" },
  { href: "/plan", label: "Plan d'Organisation", group: "Gouvernance" },
  { href: "/ecosystem", label: "Cartographie des Acteurs", group: "Gouvernance" },
  { href: "/regulatory-watch", label: "Assistance Conformité IA & Veille", group: "Veille & IA" },
  { href: "/risk-mapping?tab=table", label: "Risques identifiés", group: "Gestion des Risques" },
  { href: "/risk-mapping?tab=dmr", label: "DMR (Dispositif Maîtrise des Risques)", group: "Gestion des Risques" },
  { href: "/risk-mapping?tab=plan-actions", label: "Plan d'actions des Risques", group: "Gestion des Risques" },
  { href: "/risk-mapping?tab=matrix", label: "Matrice des Risques KYC", group: "Gestion des Risques" },
  { href: "/documents", label: "Gestion Documentaire", group: "Preuves & GRC" },
  { href: "/training", label: "Formations et Sensibilisation", group: "RH & Culture" },
  { href: "/reports", label: "Reporting Automatisé", group: "Pilotage" },
  { href: "/regtools-diff", label: "Rapprochement Clients RegTools", group: "Contrôle Opérationnel" },
  { href: "/cahier-recette", label: "Cahier de Recette RegTools", group: "Contrôle Opérationnel" },
  { href: "/controle-suivi", label: "Contrôle et Suivi", group: "Contrôle Opérationnel" },
];

export const PILLAR_CONFIG: Record<MemoPillar, { label: string; short: string; badgeClass: string; borderClass: string; icon: string }> = {
  LAB_FT: {
    label: "LAB / FT",
    short: "LAB/FT",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/50 dark:border-amber-700/50",
    borderClass: "border-l-amber-500",
    icon: "🛡️"
  },
  CONFORMITE_REGLEMENTAIRE: {
    label: "Conformité Réglementaire",
    short: "Réglementaire",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/50 dark:border-emerald-700/50",
    borderClass: "border-l-emerald-500",
    icon: "⚖️"
  },
  AUDIT_CONTROLE: {
    label: "Audit & Contrôle Interne",
    short: "Audit",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300/50 dark:border-blue-700/50",
    borderClass: "border-l-blue-500",
    icon: "🔍"
  },
  GENERAL: {
    label: "Général / Pense-bête",
    short: "Général",
    badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/50 dark:border-slate-700/50",
    borderClass: "border-l-slate-400",
    icon: "📌"
  }
};
