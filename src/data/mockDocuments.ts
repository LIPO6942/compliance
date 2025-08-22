
import type { Document } from '@/types/compliance';

export const initialMockDocuments: Document[] = [
  {
    id: 'doc-lbaft-manual',
    name: 'Manuel Interne de Procédures LBA/FT',
    type: 'Procédure',
    version: '3.0',
    status: 'En Révision',
    lastUpdated: '2024-07-26',
    owner: 'Responsable Conformité / Direction',
    tags: ['Procédures', 'Contrôles Internes', 'Conformité', 'LBA/FT'],
    url: 'https://mega.nz/file/MbN1nCBK#GvQJAqDarN--9VreCKsFMOowU8QgQ9fXN-pqZess0KA'
  },
  {
    id: 'doc-kyc-id',
    name: "Documents d'Identification Client (KYC)",
    type: "Légal/Officiel",
    version: '1.0',
    status: 'Validé',
    lastUpdated: '2024-07-26',
    owner: 'Client / Agent de Souscription',
    tags: ['KYC', 'Identification Client', 'Diligence']
  },
  {
    id: 'doc-kyc-fiche',
    name: 'Fiche KYC (Personne Physique, Morale, OBNL, Parti Politique)',
    type: 'Formulaire Interne',
    version: '2.3',
    status: 'En Révision',
    lastUpdated: '2024-07-26',
    owner: 'Agent de Souscription / Client',
    tags: ['KYC', 'Identification Client', 'Enregistrement Interne']
  },
  {
    id: 'doc-risk-decl',
    name: 'Formulaire de Déclaration du Risque',
    type: 'Contractuel',
    version: '1.1',
    status: 'Validé',
    lastUpdated: '2024-07-26',
    owner: 'Client / Agent de Souscription',
    tags: ["Opération d'Assurance", 'Contrat', 'Diligence']
  },
  {
    id: 'doc-insurance-contract',
    name: "Contrat d'Assurance et Annexes",
    type: 'Contractuel',
    version: '1.0',
    status: 'Archivé',
    lastUpdated: '2024-01-30',
    owner: "Compagnie d'Assurance",
    tags: ['Contrat', 'Opération', 'Diligence']
  },
  {
    id: 'doc-funds-origin',
    name: "Justificatifs de l'Origine des Fonds",
    type: 'Financier',
    version: '1.0',
    status: 'Validé',
    lastUpdated: '2024-07-26',
    owner: 'Client / Responsable Conformité',
    tags: ['Fonds', 'Transaction', 'LBA/FT']
  },
  {
    id: 'doc-suspicious-behavior',
    name: 'Description Détaillée des Comportements Suspects',
    type: 'Rapport Interne',
    version: '1.0',
    status: 'En Révision',
    lastUpdated: '2024-07-26',
    owner: 'Agence / Responsable Conformité',
    tags: ['Soupçon', 'Alerte', 'Signalement Interne', 'LBA/FT']
  },
  {
    id: 'doc-ppe-check',
    name: 'Informations de Vérification du Statut de PPE',
    type: 'Rapport Interne',
    version: '1.0',
    status: 'Validé',
    lastUpdated: '2024-07-26',
    owner: 'Agence / Responsable Conformité',
    tags: ['PPE', 'Diligence Renforcée', 'Risque Client']
  },
  {
    id: 'doc-beneficiary-id',
    name: 'Documentation d’Identification du Bénéficiaire Effectif (BE)',
    type: 'Rapport Interne',
    version: '1.2',
    status: 'Validé',
    lastUpdated: '2024-07-26',
    owner: 'Responsable Conformité',
    tags: ['Bénéficiaire Effectif', 'Diligence', 'LBA/FT']
  },
  {
    id: 'doc-specific-ops',
    name: "Justificatifs d'Opérations Spécifiques (Rachat, Transfert, Modifications)",
    type: 'Documents Justificatifs',
    version: '1.0',
    status: 'Validé',
    lastUpdated: '2024-07-26',
    owner: 'Client / Responsable Conformité',
    tags: ['Transaction', 'Post-Souscription', 'Mise à Jour KYC']
  },
  {
    id: 'doc-client-file',
    name: 'Dossier Client Complet',
    type: 'Registre/Dossier Physique/Electronique',
    version: '1.0',
    status: 'Archivé',
    lastUpdated: '2024-07-26',
    owner: "Agence / Compagnie d'Assurance",
    tags: ['Archivage', 'Conformité', 'KYC']
  },
  {
    id: 'doc-internal-report',
    name: 'Déclaration Interne de Soupçon / Alerte Interne',
    type: 'Rapport Interne',
    version: '1.0',
    status: 'Validé',
    lastUpdated: '2024-07-26',
    owner: 'Agent / Responsable Conformité',
    tags: ['Soupçon', 'Alerte', 'Signalement Interne', 'LBA/FT']
  },
  {
    id: 'doc-sanctions-list',
    name: 'Listes de Sanctions (Nationale CNLCT, ONU, UE, OFAC)',
    type: 'Base de Données Externe',
    version: 'N/A',
    status: 'Validé',
    lastUpdated: '2024-07-26',
    owner: 'Responsable Conformité',
    tags: ['Sanctions', 'Financement du Terrorisme', 'Prolifération AMD', 'Conformité']
  },
  {
    id: 'doc-internal-audit',
    name: 'Rapport d’Audit Interne sur le Dispositif LBA/FT',
    type: 'Rapport',
    version: '2024',
    status: 'Validé',
    lastUpdated: '2024-07-26',
    owner: 'Audit Interne / Responsable Conformité',
    tags: ['Audit', 'Contrôle Interne', 'Conformité', 'LBA/FT']
  },
  {
    id: 'doc-stats-ds',
    name: 'Rapport Statistique des Déclarations de Soupçon',
    type: 'Rapport',
    version: '1.0',
    status: 'Validé',
    lastUpdated: '2024-07-26',
    owner: 'Responsable Conformité',
    tags: ['Reporting', 'Statistiques', 'DS', 'CTAF', 'LBA/FT']
  },
  {
    id: 'doc-frozen-contracts',
    name: 'Rapport sur les Contrats Gelés',
    type: 'Rapport',
    version: '1.0',
    status: 'Validé',
    lastUpdated: '2024-07-26',
    owner: 'Responsable Conformité',
    tags: ['Reporting', 'Gel des Avoirs', 'Sanctions']
  },
  {
    id: 'doc-diligence-respect',
    name: "Rapport sur le Respect des Diligences d'Identification",
    type: 'Rapport',
    version: '1.0',
    status: 'Validé',
    lastUpdated: '2024-07-26',
    owner: 'Responsable Conformité',
    tags: ['Reporting', 'Conformité', 'KYC']
  },
  {
    id: 'doc-annual-compliance',
    name: 'Rapport Annuel du Responsable de la Conformité',
    type: 'Rapport',
    version: '2023',
    status: 'Archivé',
    lastUpdated: '2024-02-01',
    owner: 'Responsable Conformité',
    tags: ['Reporting', 'Conformité', 'LBA/FT', 'Formation']
  },
  {
    id: 'doc-ds-ctaf',
    name: 'Déclaration de Soupçon (DS) à la CTAF',
    type: 'Déclaration Officielle',
    version: 'N/A',
    status: 'Validé',
    lastUpdated: '2024-07-26',
    owner: 'Correspondant CTAF',
    tags: ['DS', 'CTAF', 'LBA/FT', 'Signalement Externe']
  },
  {
    id: 'doc-decl-cnlct',
    name: 'Déclaration à la Commission Nationale de Lutte Contre le Terrorisme (CNLCT)',
    type: 'Déclaration Officielle',
    version: 'N/A',
    status: 'Validé',
    lastUpdated: '2024-07-26',
    owner: 'Correspondant CNLCT',
    tags: ['Sanctions', 'Gel des Avoirs', 'Financement du Terrorisme', 'CNLCT']
  },
  {
    id: 'doc-training-program',
    name: 'Programmes et Matériels de Formation LBA/FT',
    type: 'Support de Formation',
    version: '2024',
    status: 'En Révision',
    lastUpdated: '2024-07-26',
    owner: 'Service RH/Formation / Responsable Conformité',
    tags: ['Formation', 'Ressources Humaines', 'Conformité', 'LBA/FT']
  }
];
