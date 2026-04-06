export type LegalBaseCategory = 
  | "Lois"
  | "Décrets"
  | "Réglements (CGA/BCT)"
  | "Circulaire"
  | "Lignes directrices"
  | "Normes internationales"
  | "Procédures internes";

export const LEGAL_BASE_CATEGORIES: LegalBaseCategory[] = [
  "Lois",
  "Décrets",
  "Réglements (CGA/BCT)",
  "Circulaire",
  "Lignes directrices",
  "Normes internationales",
  "Procédures internes"
];

export interface LegalBaseText {
  id: string;
  title: string;
  source: string;
  category: LegalBaseCategory | string;
  content: string;
  isActive: boolean;
}
