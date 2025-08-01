
import type { ComplianceCategory } from '@/types/compliance';

// Icons are now string names from lucide-react
export const initialCompliancePlanData: ComplianceCategory[] = [
  {
    id: 'gouvernance-controle',
    name: 'Gouvernance & Dispositif de Contrôle',
    icon: 'Gavel',
    subCategories: [
      {
        id: 'gouvernance-controle-1',
        name: "Politique de conformité",
        icon: 'FileText',
        tasks: [
          { id: 'gouvernance-controle-task-1', name: 'Mettre en place une politique de conformité.', completed: false, year: 2024 },
          { id: 'gouvernance-controle-task-2', name: 'Contrôler la mise en place de la politique de conformité.', completed: false, year: 2024 },
          { id: 'gouvernance-controle-task-3', name: "S'assurer de l'indépendance de la fonction conformité.", completed: false, year: 2024 },
          { id: 'gouvernance-controle-task-4', name: 'Contrôler le respect de la politique de conformité.', completed: false, year: 2024 },
        ],
      },
      {
        id: 'gouvernance-controle-2',
        name: "Classification des risques",
        icon: 'ShieldAlert',
        tasks: [
          { id: 'gouvernance-controle-task-5', name: 'Identifier les risques de non-conformité.', completed: false, year: 2024 },
          { id: 'gouvernance-controle-task-6', name: 'Évaluer les risques de non-conformité.', completed: false, year: 2024 },
          { id: 'gouvernance-controle-task-7', name: 'Contrôler les risques de non-conformité.', completed: false, year: 2024 },
          { id: 'gouvernance-controle-task-8', name: 'Atténuer les risques de non-conformité.', completed: false, year: 2024 },
        ],
      },
      {
        id: 'gouvernance-controle-3',
        name: "Devoir de conseil / commercialisation",
        icon: 'MessageSquareWarning',
        tasks: [
          { id: 'gouvernance-controle-task-9', name: "S'assurer du respect du devoir de conseil.", completed: false, year: 2024 },
          { id: 'gouvernance-controle-task-10', name: 'Contrôler la bonne adéquation des produits aux besoins des clients.', completed: false, year: 2024 },
        ],
      },
      {
        id: 'gouvernance-controle-4',
        name: "Protection de la clientèle",
        icon: 'Users',
        tasks: [
          { id: 'gouvernance-controle-task-11', name: "S'assurer de la protection de la clientèle.", completed: false, year: 2024 },
          { id: 'gouvernance-controle-task-12', name: 'Contrôler le traitement des réclamations clients.', completed: false, year: 2024 },
          { id: 'gouvernance-controle-task-13', name: 'Veiller à la transparence des produits.', completed: false, year: 2024 },
          { id: 'gouvernance-controle-task-14', name: 'Gérer les conflits d\'intérêts.', completed: false, year: 2024 },
        ],
      },
      {
        id: 'gouvernance-controle-5',
        name: "Protection des données personnelles",
        icon: 'KeyRound',
        tasks: [
          { id: 'gouvernance-controle-task-15', name: "S'assurer de la protection des données personnelles.", completed: false, year: 2024 },
        ],
      },
    ],
  },
  {
    id: 'kyc-be',
    name: 'LAB FT (Lutte Anti-Blanchiment et Financement du Terrorisme)',
    icon: 'ShieldAlert',
    subCategories: [
      {
        id: 'kyc-be-collecte',
        name: "KYC (Know Your Customer)",
        icon: 'FileDigit',
        tasks: [
          { id: 'kyc-be-collecte-1', name: "Mettre en place une procédure KYC.", completed: false, year: 2024 },
          { id: 'kyc-be-collecte-2', name: "Contrôler la mise en place de la procédure KYC.", completed: false, year: 2024 },
          { id: 'kyc-be-collecte-3', name: "S'assurer de l'identification des clients.", completed: false, year: 2024 },
          { id: 'kyc-be-collecte-4', name: "S'assurer de la vérification de l'identité des clients.", completed: false, year: 2024 },
          { id: 'kyc-be-collecte-5', name: "S'assurer de la connaissance des clients.", completed: false, year: 2024 },
          { id: 'kyc-be-collecte-6', name: "S'assurer de la mise à jour des informations des clients.", completed: false, year: 2024 },
        ],
      },
      {
        id: 'kyc-be-identification',
        name: "Identification du Bénéficiaire Effectif (BE)",
        icon: 'UserCog',
        tasks: [
          { id: 'kyc-be-identification-1', name: "Mettre en place une procédure d'identification des bénéficiaires effectifs.", completed: false, year: 2024 },
          { id: 'kyc-be-identification-2', name: "Contrôler la mise en place de la procédure d'identification des bénéficiaires effectifs.", completed: false, year: 2024 },
          { id: 'kyc-be-identification-3', name: "S'assurer de l'identification des bénéficiaires effectifs.", completed: false, year: 2024 },
          { id: 'kyc-be-identification-4', name: "S'assurer de la vérification de l'identité des bénéficiaires effectifs.", completed: false, year: 2024 },
          { id: 'kyc-be-identification-5', name: "S'assurer de la connaissance des bénéficiaires effectifs.", completed: false, year: 2024 },
        ],
      },
      {
        id: 'screening-sanctions',
        name: 'Dispositif de filtrage',
        icon: 'Filter',
        tasks: [
          { id: 'screening-sanctions-1', name: "Mettre en place un dispositif de filtrage des clients et bénéficiaires effectifs.", completed: false, year: 2024 },
          { id: 'screening-sanctions-2', name: "Contrôler la mise en place du dispositif de filtrage.", completed: false, year: 2024 },
        ],
      },
      {
        id: 'monitoring-analyse',
        name: 'Surveillance des opérations',
        icon: 'Search',
        tasks: [
          { id: 'monitoring-analyse-1', name: "Mettre en place un dispositif de surveillance des opérations.", completed: false, year: 2024 },
          { id: 'monitoring-analyse-2', name: "Contrôler la mise en place du dispositif de surveillance.", completed: false, year: 2024 },
        ],
      },
      {
        id: 'declarations-ctaf',
        name: 'Déclaration de soupçon',
        icon: 'MailWarning',
        tasks: [
          { id: 'declarations-ctaf-1', name: "Mettre en place une procédure de déclaration de soupçon.", completed: false, year: 2024 },
          { id: 'declarations-ctaf-2', name: "Contrôler la mise en place de la procédure de déclaration de soupçon.", completed: false, year: 2024 },
        ],
      },
      {
        id: 'declarations-cnlct',
        name: 'Gel des avoirs',
        icon: 'Lock',
        tasks: [
          { id: 'declarations-cnlct-1', name: "Mettre en place une procédure de gel des avoirs.", completed: false, year: 2024 },
          { id: 'declarations-cnlct-2', name: "Contrôler la mise en place de la procédure de gel des avoirs.", completed: false, year: 2024 },
        ],
      },
    ],
  },
  {
    id: 'reporting',
    name: 'Reporting',
    icon: 'FilePieChart',
    subCategories: [
      {
        id: 'reporting-cga',
        name: 'Rapports au CGA',
        icon: 'Sheet',
        tasks: [
          { id: 'reporting-cga-1', name: 'Élaborer le rapport sur les DS, contrats gelés et activités de conformité.', completed: false, deadline: '2025-01-31T23:59:59.999Z', year: 2024 },
        ],
      },
    ],
  },
  {
    id: 'formation',
    name: 'Formation',
    icon: 'Projector',
    subCategories: [
      {
        id: 'formation-programme',
        name: 'Programme de Formation Continue',
        icon: 'BookOpen',
        tasks: [
          { id: 'formation-programme-1', name: 'Mettre en place un programme de formation.', completed: false, year: 2024 },
          { id: 'formation-programme-2', name: 'Contrôler la mise en place du programme de formation.', completed: false, year: 2024 },
        ],
      },
    ],
  },
  {
    id: 'audit',
    name: 'Piste d\'audit',
    icon: 'ClipboardCheck',
    subCategories: [
      {
        id: 'audit-programme',
        name: "Programme d'Audit",
        icon: 'ListTodo',
        tasks: [
          { id: 'audit-programme-1', name: 'Mettre en place une piste d\'audit.', completed: false, year: 2024 },
          { id: 'audit-programme-2', name: "Contrôler la mise en place de la piste d'audit.", completed: false, year: 2024 },
        ],
      },
    ],
  },
];
