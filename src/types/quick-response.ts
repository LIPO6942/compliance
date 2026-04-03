export type QuickResponseVerdict = 
  | 'REFUSER' 
  | 'SUSPENDRE' 
  | 'ACCEPTER' 
  | 'BLOQUER' 
  | 'GEL' 
  | 'VÉRIFIER' 
  | 'DÉCLARER' 
  | 'GEL IMMÉDIAT' 
  | 'SUSPENDRE L\'INDEMNISATION' 
  | 'GEL PARTIEL' 
  | 'GEL TOTAL' 
  | 'LISTE DES DÉCLENCHEURS' 
  | 'SUIVRE LA DÉMARCHE PROGRESSIVE'
  | 'ACCEPTER SOUS CONDITION' 
  | 'VÉRIFIER AVANT TOUTE DÉCISION' 
  | 'DÉCLARER EN INTERNE';

export type QuickResponseColor = 'red' | 'orange' | 'green';

export interface QuickResponseLegalBase {
  article: string;
  text: string;
  link?: string;
}

export interface QuickResponseFiche {
  id: string;
  title: string;
  verdict: QuickResponseVerdict;
  color: QuickResponseColor;
  steps: string[];
  note?: string;
  exception?: string;
  legalBase: QuickResponseLegalBase;
  isFrequent?: boolean;
  category?: string;
}

export interface DecisionHistoryEntry {
  id: string;
  ficheId: string;
  date: string;
  decision: string;
  validatedBy: string;
  notes?: string;
}
