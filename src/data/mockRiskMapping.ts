
import type { RiskMappingItem } from '@/types/compliance';

export const initialMockRiskMapping: RiskMappingItem[] = [
  {
    id: 'risk001',
    department: 'Commercial',
    category: 'Canaux de Distribution',
    documentIds: ['doc-lbaft-manual'],
    riskDescription: 'Risque de vente de produits inadaptés aux clients, entraînant des sanctions et une mauvaise réputation.',
    likelihood: 'Modérée',
    impact: 'Élevé',
    riskLevel: 'Élevé',
    expectedAction: 'Mise à jour des supports de vente + formation du réseau commercial',
    owner: 'Direction Commerciale',
    lastUpdated: '2024-07-20',
  },
  {
    id: 'risk002',
    department: 'DSI',
    category: 'Produits et Services',
    documentIds: ['doc-lbaft-manual'],
    riskDescription: 'Fuite de données clients suite à une cyber-attaque ou une mauvaise configuration des systèmes.',
    likelihood: 'Faible',
    impact: 'Très élevé',
    riskLevel: 'Élevé', // Corrected based on new calculation
    expectedAction: 'Réaliser un audit de sécurité annuel et des tests de pénétration.',
    owner: 'RSSI',
    lastUpdated: '2024-06-15',
  },
  {
    id: 'risk003',
    department: 'Finances',
    category: 'Clients',
    documentIds: ['doc-suspicious-behavior', 'doc-ds-ctaf'],
    riskDescription: 'Non-détection d\'une transaction suspecte pouvant mener à des sanctions de la CTAF.',
    likelihood: 'Modérée',
    impact: 'Élevé',
    riskLevel: 'Élevé', // Corrected based on new calculation
    expectedAction: 'Renforcement des scénarios de détection dans l\'outil de surveillance des transactions.',
    owner: 'Responsable Conformité',
    lastUpdated: '2024-05-10',
  },
   {
    id: 'risk004',
    department: 'Sinistre corporel',
    category: 'Clients',
    documentIds: ['doc-insurance-contract'],
    riskDescription: 'Retards ou erreurs dans le processus d\'indemnisation des victimes, causant des litiges coûteux.',
    likelihood: 'Élevée',
    impact: 'Modéré',
    riskLevel: 'Élevé', // Corrected based on new calculation
    expectedAction: 'Automatiser une partie du suivi des dossiers et former les gestionnaires sur les nouvelles jurisprudences.',
    owner: 'Direction Sinistres',
    lastUpdated: '2024-07-01',
  },
];
