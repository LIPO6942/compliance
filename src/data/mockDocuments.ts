
import type { Document } from '@/types/compliance';

export const initialMockDocuments: Document[] = [
  { id: "doc001", name: "Politique LAB-FT", type: "Politique", version: "2.1", status: "Validé", lastUpdated: "2024-07-15", owner: "MOSLEM GOUIA", tags: ["LAB-FT", "Core"] },
  { id: "doc002", name: "Procédure KYC", type: "Procédure", version: "1.5", status: "En Révision", lastUpdated: "2024-06-20", owner: "MOSLEM GOUIA", tags: ["LAB-FT", "Client"] },
  { id: "doc003", name: "Rapport de Conformité Annuel 2023", type: "Rapport", version: "1.0", status: "Archivé", lastUpdated: "2024-01-30", owner: "MOSLEM GOUIA", tags: ["Reporting", "Annuel"] },
  { id: "doc004", name: "Support Formation MIFID II", type: "Support de Formation", version: "3.0", status: "Validé", lastUpdated: "2024-05-10", owner: "MOSLEM GOUIA", tags: ["Formation", "MIFID"] },
  { id: "doc005", name: "Analyse d'impact DORA", type: "Veille", version: "0.8", status: "En Révision", lastUpdated: "2024-07-25", owner: "MOSLEM GOUIA", tags: ["Veille", "DORA", "IT"] },
  { id: "doc006", name: "Politique de Protection des Données", type: "Politique", version: "4.2", status: "Validé", lastUpdated: "2023-11-01", owner: "MOSLEM GOUIA", tags: ["RGPD", "Core"] },
  { id: "doc007", name: "Procédure de Gestion des Incidents", type: "Procédure", version: "2.0", status: "Obsolète", lastUpdated: "2022-08-15", owner: "MOSLEM GOUIA", tags: ["Incidents", "Sécurité"] },
];
