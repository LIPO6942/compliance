
import type { IdentifiedRegulation } from '@/types/compliance';

export const initialMockRegulations: IdentifiedRegulation[] = [
  {
    id: "alert-001",
    publicationDate: "2024-07-22",
    source: "Veille IA",
    type: "Nouvelle loi",
    summary: "Nouvelle directive sur la publication des rapports de durabilité (CSRD)",
    fullText: "Le texte complet de la directive CSRD impose de nouvelles obligations de reporting extra-financier pour les grandes entreprises.",
    status: "Nouveau",
    criticality: "Haute",
    keywords: ["CSRD", "ESG", "Reporting"],
    aiAnalysis: {
        "Obligations": ["Publication d'un rapport de durabilité détaillé.", "Vérification par un tiers indépendant.", "Inclusion des risques et opportunités ESG."],
        "Echéances": ["Premier rapport à publier en 2025 sur les données de 2024.", "Alignement progressif pour les PME cotées."]
    },
  },
  {
    id: "alert-002",
    publicationDate: "2024-07-20",
    source: "Cartographie des Risques",
    type: "Risque Interne",
    summary: "Risque de non-conformité sur la procédure de connaissance client (KYC).",
    fullText: "Risque identifié de documentation incomplète pour les nouveaux clients, pouvant entraîner des sanctions.",
    status: "En cours d'analyse",
    criticality: "Moyenne",
    deadline: "2024-08-30",
    affectedDepartments: ["Commercial", "Conformité"],
    requiredActions: "Revue de 10% des dossiers récents et rappel de la procédure aux équipes.",
    keywords: ["KYC", "LAB-FT"],
  },
  {
    id: "alert-003",
    publicationDate: "2024-06-15",
    source: "JORT",
    type: "Modification réglementaire",
    summary: "Mise à jour du seuil de déclaration pour les transactions suspectes.",
    fullText: "Le seuil pour la déclaration de soupçon a été abaissé de 5000 TND à 3000 TND pour certaines opérations.",
    status: "Traité",
    criticality: "Moyenne",
    keywords: ["LAB-FT", "Déclaration de soupçon"],
    analysisNotes: "Procédure interne mise à jour. Formation dispensée aux équipes le 01/07/2024."
  }
];
