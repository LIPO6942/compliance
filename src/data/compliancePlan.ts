import type { ComplianceCategory } from '@/types/compliance';

// Icons are now string names from lucide-react
export const initialCompliancePlanData: ComplianceCategory[] = [
  {
    id: 'gouvernance',
    name: 'Gouvernance de la conformité',
    icon: 'Gavel',
    subCategories: [
      {
        id: 'gouvernance-cadre',
        name: 'Définition du cadre de gouvernance',
        icon: 'Sheet',
        tasks: [
          { id: 'gouvernance-cadre-1', name: 'Élaborer et maintenir la charte de la conformité.' },
          { id: 'gouvernance-cadre-2', name: 'Définir les politiques et procédures de conformité.' },
          { id: 'gouvernance-cadre-3', name: 'Mettre en place une cartographie des risques de non-conformité.' },
        ],
      },
      {
        id: 'gouvernance-organisation',
        name: 'Organisation de la fonction conformité',
        icon: 'Users',
        tasks: [
          { id: 'gouvernance-organisation-1', name: 'Définir les rôles et responsabilités au sein du département.' },
          { id: 'gouvernance-organisation-2', name: 'Assurer une communication efficace avec les instances dirigeantes.' },
          { id: 'gouvernance-organisation-3', name: 'Gérer le budget et les ressources du département conformité.' },
        ],
      },
    ],
  },
  {
    id: 'lab-ft',
    name: 'Lutte contre le blanchiment et financement du terrorisme (LAB-FT)',
    icon: 'ShieldAlert',
    subCategories: [
      {
        id: 'lab-ft-vigilance',
        name: 'Dispositif de vigilance',
        icon: 'Eye',
        tasks: [
          { id: 'lab-ft-vigilance-1', name: 'Mettre en œuvre les obligations de connaissance client (KYC/KYB).' },
          { id: 'lab-ft-vigilance-2', name: 'Effectuer la surveillance des opérations et transactions suspectes.' },
          { id: 'lab-ft-vigilance-3', name: 'Gérer les déclarations de soupçon à TRACFIN.' },
        ],
      },
      {
        id: 'lab-ft-sanctions',
        name: 'Sanctions financières et gel des avoirs',
        icon: 'Lock',
        tasks: [
          { id: 'lab-ft-sanctions-1', name: 'Filtrer les bases clients et transactions par rapport aux listes de sanctions.' },
          { id: 'lab-ft-sanctions-2', name: 'Mettre en œuvre les mesures de gel des avoirs.' },
        ],
      },
    ],
  },
  {
    id: 'veille',
    name: 'Veille réglementaire et conformité produit',
    icon: 'SearchCheck',
    subCategories: [
      {
        id: 'veille-identification',
        name: 'Identification et analyse des évolutions réglementaires',
        icon: 'FileSearch',
        tasks: [
          { id: 'veille-identification-1', name: 'Suivre les publications des régulateurs (ACPR, AMF, EBA, etc.).' },
          { id: 'veille-identification-2', name: 'Analyser l\'impact des nouvelles réglementations sur l\'activité.' },
          { id: 'veille-identification-3', name: 'Diffuser les informations pertinentes en interne.' },
        ],
      },
      {
        id: 'veille-produit',
        name: 'Conformité des produits et services',
        icon: 'PackageCheck',
        tasks: [
          { id: 'veille-produit-1', name: 'Valider la conformité des nouveaux produits avant leur lancement.' },
          { id: 'veille-produit-2', name: 'Revoir périodiquement la conformité des produits existants.' },
          { id: 'veille-produit-3', name: 'S\'assurer de la clarté et de la conformité de la documentation commerciale.' },
        ],
      },
    ],
  },
  {
    id: 'controles',
    name: 'Contrôles et reporting',
    icon: 'ClipboardCheck',
    subCategories: [
      {
        id: 'controles-plan',
        name: 'Plan de contrôle de conformité',
        icon: 'ListChecks',
        tasks: [
          { id: 'controles-plan-1', name: 'Élaborer et mettre à jour le plan de contrôle annuel.' },
          { id: 'controles-plan-2', name: 'Réaliser les contrôles de second niveau sur les processus clés.' },
          { id: 'controles-plan-3', name: 'Suivre la mise en œuvre des plans d\'actions correctrices.' },
        ],
      },
      {
        id: 'controles-reporting',
        name: 'Reporting réglementaire et interne',
        icon: 'BarChart3',
        tasks: [
          { id: 'controles-reporting-1', name: 'Préparer et soumettre les rapports réglementaires périodiques.' },
          { id: 'controles-reporting-2', name: 'Produire des tableaux de bord de conformité pour la direction.' },
          { id: 'controles-reporting-3', name: 'Assurer le suivi des indicateurs clés de risque (KRI) de conformité.' },
        ],
      },
    ],
  },
  {
    id: 'formation',
    name: 'Formation et sensibilisation',
    icon: 'Users',
    subCategories: [
      {
        id: 'formation-programme',
        name: 'Programme de formation',
        icon: 'BookOpen',
        tasks: [
          { id: 'formation-programme-1', name: 'Concevoir et déployer des modules de formation sur la conformité.' },
          { id: 'formation-programme-2', name: 'Organiser des sessions de formation régulières pour les collaborateurs.' },
          { id: 'formation-programme-3', name: 'Adapter les formations aux spécificités des métiers.' },
        ],
      },
      {
        id: 'formation-sensibilisation',
        name: 'Actions de sensibilisation',
        icon: 'Megaphone',
        tasks: [
          { id: 'formation-sensibilisation-1', name: 'Diffuser des communications régulières sur les enjeux de conformité.' },
          { id: 'formation-sensibilisation-2', name: 'Organiser des événements pour promouvoir une culture de la conformité.' },
        ],
      },
    ],
  },
  {
    id: 'reclamations',
    name: 'Réclamations et lanceurs d’alerte',
    icon: 'MessageSquareWarning',
    subCategories: [
      {
        id: 'reclamations-gestion',
        name: 'Gestion des réclamations clients',
        icon: 'MailWarning',
        tasks: [
          { id: 'reclamations-gestion-1', name: 'Centraliser et traiter les réclamations clients liées à la conformité.' },
          { id: 'reclamations-gestion-2', name: 'Analyser les causes des réclamations et proposer des améliorations.' },
          { id: 'reclamations-gestion-3', name: 'Assurer le reporting sur les réclamations.' },
        ],
      },
      {
        id: 'reclamations-alerte',
        name: 'Dispositif de lancement d’alerte',
        icon: 'Siren',
        tasks: [
          { id: 'reclamations-alerte-1', name: 'Gérer le canal de réception des alertes éthiques et professionnelles.' },
          { id: 'reclamations-alerte-2', name: 'Instruire les alertes reçues en toute confidentialité.' },
          { id: 'reclamations-alerte-3', name: 'Protéger les lanceurs d’alerte conformément à la réglementation.' },
        ],
      },
    ],
  },
  {
    id: 'projets',
    name: 'Projets et outils',
    icon: 'FolderKanban',
    subCategories: [
      {
        id: 'projets-conduite',
        name: 'Conduite de projets conformité',
        icon: 'Projector',
        tasks: [
          { id: 'projets-conduite-1', name: 'Participer aux projets de l\'entreprise ayant un impact sur la conformité.' },
          { id: 'projets-conduite-2', name: 'Piloter les projets spécifiques au département conformité.' },
        ],
      },
      {
        id: 'projets-outils',
        name: 'Gestion des outils de conformité',
        icon: 'Wrench',
        tasks: [
          { id: 'projets-outils-1', name: 'Administrer et faire évoluer les outils de conformité (ex: GRC, LAB-FT).' },
          { id: 'projets-outils-2', name: 'Assurer la veille technologique sur les solutions de conformité.' },
        ],
      },
    ],
  },
];
