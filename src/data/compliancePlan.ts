
import type { ComplianceCategory } from '@/types/compliance';

// Icons are now string names from lucide-react
export const initialCompliancePlanData: ComplianceCategory[] = [
  {
    id: 'kyc-be',
    name: 'KYC & Identification du Bénéficiaire Effectif',
    icon: 'Users',
    subCategories: [
      {
        id: 'kyc-be-collecte',
        name: "Collecte et vérification des données (EER)",
        icon: 'FileDigit',
        tasks: [
          { id: 'kyc-be-collecte-1', name: "Pour les personnes physiques : Exiger des documents d'identité certifiés conformes, justificatif de domicile, informations professionnelles et fiche KYC signée.", completed: false, year: 2024 },
          { id: 'kyc-be-collecte-2', name: "Pour les personnes morales : Exiger statuts, RNE, liste des actionnaires, identité des dirigeants et fiche KYC complétée.", completed: false, year: 2024 },
          { id: 'kyc-be-collecte-3', name: "Pour les OBNL : Exiger JORT de constitution, statuts, identité des personnes habilitées et fiche KYC.", completed: false, year: 2024 },
          { id: 'kyc-be-collecte-4', name: "Pour les partis politiques : Exiger JORT, autorisation, statuts, liste du bureau exécutif et fiche KYC.", completed: false, year: 2024 },
        ],
      },
      {
        id: 'kyc-be-identification',
        name: "Identification du Bénéficiaire Effectif (BE)",
        icon: 'UserCog',
        tasks: [
          { id: 'kyc-be-identification-1', name: "Appliquer la démarche progressive d'identification du BE (seuil de 20%).", completed: false, year: 2024 },
          { id: 'kyc-be-identification-2', name: "Documenter l'ensemble de la démarche d'identification du BE.", completed: false, year: 2024 },
          { id: 'kyc-be-identification-3', name: "Identifier le dirigeant principal si aucun BE ne peut être déterminé.", completed: false, year: 2024 },
        ],
      },
      {
        id: 'kyc-be-maj',
        name: "Mise à jour des données clients",
        icon: 'Edit3',
        tasks: [
            { id: 'kyc-be-maj-1', name: 'Mettre à jour les données client tout au long de la relation d\'affaires.', completed: false, year: 2024 },
            { id: 'kyc-be-maj-2', name: 'Définir des triggers pour la mise à jour (changement de capital, résiliation, etc.).', completed: false, year: 2024 },
        ],
      },
    ],
  },
  {
    id: 'screening',
    name: 'Filtrage (Screening) des Clients',
    icon: 'Filter',
    subCategories: [
      {
        id: 'screening-sanctions',
        name: 'Listes de Sanctions',
        icon: 'Lock',
        tasks: [
          { id: 'screening-sanctions-1', name: "Filtrer les clients et BE contre les listes CNLCT et ONU.", completed: false, year: 2024 },
          { id: 'screening-sanctions-2', name: "Suspendre le dossier et informer le responsable conformité si correspondance.", completed: false, year: 2024 },
        ],
      },
      {
        id: 'screening-surveillance',
        name: 'Listes de Surveillance',
        icon: 'Eye',
        tasks: [
          { id: 'screening-surveillance-1', name: 'Identifier les PPE et clients sur listes de surveillance pour vigilance spécifique.', completed: false, year: 2024 },
        ],
      },
    ],
  },
  {
    id: 'abr',
    name: "Évaluation Périodique des Risques (ABR)",
    icon: 'ShieldAlert',
    subCategories: [
      {
        id: 'abr-evaluation',
        name: 'Détermination et Évaluation des Risques',
        icon: 'PieChart',
        tasks: [
          { id: 'abr-evaluation-1', name: 'Identifier et évaluer les risques inhérents (clients, produits, pays, canaux).', completed: false, year: 2024 },
          { id: 'abr-evaluation-2', name: "Définir et évaluer l'appétence au risque de la société.", completed: false, year: 2024 },
          { id: 'abr-evaluation-3', name: "Évaluer l'efficacité des mesures de contrôle et d'atténuation.", completed: false, year: 2024 },
          { id: 'abr-evaluation-4', name: 'Calculer le risque résiduel (net).', completed: false, year: 2024 },
        ],
      },
      {
        id: 'abr-plan',
        name: "Plan d'action et Mise à Jour",
        icon: 'ListChecks',
        tasks: [
          { id: 'abr-plan-1', name: "Élaborer et mettre en œuvre un plan d'action pour améliorer le dispositif LBA/FT.", completed: false, year: 2024 },
          { id: 'abr-plan-2', name: 'Maintenir à jour la cartographie des risques (annuellement ou sur événement).', completed: false, year: 2024 },
        ],
      },
    ],
  },
  {
    id: 'vigilance',
    name: 'Vigilance Renforcée',
    icon: 'SearchCheck',
    subCategories: [
      {
        id: 'vigilance-mesures',
        name: 'Mesures Spécifiques pour Risques Élevés et PPE',
        icon: 'Activity',
        tasks: [
          { id: 'vigilance-mesures-1', name: 'Appliquer des mesures renforcées pour les risques élevés et les PPE.', completed: false, year: 2024 },
          { id: 'vigilance-mesures-2', name: "Obtenir des informations supplémentaires sur l'activité et l'origine des fonds.", completed: false, year: 2024 },
          { id: 'vigilance-mesures-3', name: 'Effectuer des contrôles intensifs et obtenir l\'autorisation de la DG pour les PPE.', completed: false, year: 2024 },
        ],
      },
    ],
  },
  {
    id: 'monitoring',
    name: 'Monitoring et Détection des Opérations Suspectes',
    icon: 'RadioTower',
    subCategories: [
      {
        id: 'monitoring-analyse',
        name: 'Analyse et Détection',
        icon: 'Search',
        tasks: [
          { id: 'monitoring-analyse-1', name: 'Analyser les opérations pour vérifier leur adéquation avec le profil client.', completed: false, year: 2024 },
          { id: 'monitoring-analyse-2', name: 'Détecter les comportements suspects (réticence, curiosité excessive, etc.).', completed: false, year: 2024 },
          { id: 'monitoring-analyse-3', name: 'Assurer la possibilité pour le personnel de faire une déclaration interne de soupçon.', completed: false, year: 2024 },
          { id: 'monitoring-analyse-4', name: 'Le SI doit générer des alertes automatiques basées sur des typologies.', completed: false, year: 2024 },
        ],
      },
    ],
  },
  {
    id: 'declarations',
    name: 'Déclarations et Gel des Avoirs',
    icon: 'Siren',
    subCategories: [
      {
        id: 'declarations-ctaf',
        name: 'Déclarations à la CTAF',
        icon: 'MailWarning',
        tasks: [
          { id: 'declarations-ctaf-1', name: 'Déclarer les opérations suspectes à la CTAF via goAML.', completed: false, year: 2024 },
          { id: 'declarations-ctaf-2', name: 'Répondre aux demandes d\'information de la CTAF via goAML.', completed: false, year: 2024 },
        ],
      },
      {
        id: 'declarations-cnlct',
        name: 'Déclarations CNLCT et Gel des Avoirs',
        icon: 'Lock',
        tasks: [
          { id: 'declarations-cnlct-1', name: 'Déclarer les soupçons liés au FT à la CNLCT.', completed: false, year: 2024 },
          { id: 'declarations-cnlct-2', name: 'Geler les fonds ou ressources en cas de correspondance avec une liste de sanctions (dans les 8h).', completed: false, year: 2024 },
          { id: 'declarations-cnlct-3', name: 'Informer la CNLCT du gel des avoirs.', completed: false, year: 2024 },
          { id: 'declarations-cnlct-4', name: 'Déposer les fonds gelés sur un compte d\'attente.', completed: false, year: 2024 },
        ],
      },
    ],
  },
  {
    id: 'conservation',
    name: 'Conservation des Documents',
    icon: 'Archive',
    subCategories: [
      {
        id: 'conservation-duree',
        name: 'Règles de Conservation',
        icon: 'CalendarDays',
        tasks: [
          { id: 'conservation-duree-1', name: 'Conserver les dossiers clients et pièces des opérations pendant 10 ans après fin de relation.', completed: false, year: 2024 },
          { id: 'conservation-duree-2', name: 'Assurer la consultabilité des documents pour reconstitution des opérations.', completed: false, year: 2024 },
        ],
      },
    ],
  },
  {
    id: 'formation',
    name: 'Formation des Collaborateurs',
    icon: 'Projector',
    subCategories: [
      {
        id: 'formation-programme',
        name: 'Programme de Formation Continue',
        icon: 'BookOpen',
        tasks: [
          { id: 'formation-programme-1', name: 'Assurer une formation continue au personnel (au moins une fois par an).', completed: false, year: 2024 },
          { id: 'formation-programme-2', name: 'Couvrir les risques, nouvelles tendances, détection et déclaration.', completed: false, year: 2024 },
        ],
      },
    ],
  },
  {
    id: 'reporting',
    name: 'Reporting Réglementaire (CGA)',
    icon: 'FilePieChart',
    subCategories: [
      {
        id: 'reporting-cga',
        name: 'Rapports Annuels au CGA',
        icon: 'Sheet',
        tasks: [
          { id: 'reporting-cga-1', name: 'Adresser les procédures internes LBA/FT au CGA.', completed: false, deadline: '2025-01-31T23:59:59.999Z', year: 2024 },
          { id: 'reporting-cga-2', name: 'Adresser le rapport d\'audit interne LBA/FT au CGA.', completed: false, deadline: '2025-01-31T23:59:59.999Z', year: 2024 },
          { id: 'reporting-cga-3', name: 'Adresser le rapport sur les DS, contrats gelés et activités de conformité au CGA.', completed: false, deadline: '2025-01-31T23:59:59.999Z', year: 2024 },
        ],
      },
    ],
  },
  {
    id: 'audit',
    name: 'Contrôle et Audit Interne',
    icon: 'ClipboardCheck',
    subCategories: [
      {
        id: 'audit-programme',
        name: "Programme d'Audit",
        icon: 'ListTodo',
        tasks: [
          { id: 'audit-programme-1', name: 'Le contrôle du dispositif LBA/FT doit faire partie du programme d\'audit interne.', completed: false, year: 2024 },
          { id: 'audit-programme-2', name: "Réaliser un audit du dispositif de contrôle interne LBA/FT au moins tous les 2 ans.", completed: false, year: 2024 },
        ],
      },
    ],
  },
];
