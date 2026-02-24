
import type { ComplianceCategory, ComplianceTask } from '@/types/compliance';

// Icons are now string names from lucide-react
export const initialCompliancePlanData: ComplianceCategory[] = [
  {
    id: 'cadre-reglementaire',
    name: 'Cadre Réglementaire et Stratégique',
    icon: 'Gavel',
    subCategories: [
      {
        id: 'cadre-reglementaire-politiques',
        name: 'Établissement et Maintien des Politiques et Procédures',
        icon: 'FileText',
        tasks: [
          { id: 'task-cadre-1', name: "Élaborer un manuel interne de procédures de Lutte contre le Blanchiment d'Argent et le Financement du Terrorisme (LBA/FT).", completed: true, documentIds: ['doc-lbaft-manual'] },
          { id: 'task-cadre-2', name: "Mettre en place des politiques et procédures complètes, détaillées et opérationnelles, adaptées à la nature et à la taille de la société, et répondant aux exigences réglementaires en matière de LBA/FT.", completed: false },
          { id: 'task-cadre-3', name: "Assurer la diffusion de ces procédures à l'ensemble du personnel.", completed: false },
          { id: 'task-cadre-4', name: "Obtenir l'approbation de la direction générale et du conseil d'administration pour les politiques et procédures internes.", completed: false },
          { id: 'task-cadre-5', name: "Veiller à ce que les politiques et procédures soient régulièrement révisées et mises à jour.", completed: false },
        ],
      },
      {
        id: 'cadre-reglementaire-risques',
        name: 'Évaluation et Gestion des Risques (Approche Basée sur les Risques - ABR)',
        icon: 'ShieldAlert',
        tasks: [
          { id: 'task-cadre-6', name: "Identifier, évaluer et comprendre les risques inhérents de BA/FT auxquels la société est exposée, en tenant compte des facteurs de risque liés aux clients/bénéficiaires effectifs, aux produits/services commercialisés, aux pays/zones géographiques, et aux réseaux de distribution.", completed: false },
          { id: 'task-cadre-7', name: "Développer une matrice des risques de LBA/FT spécifique à l'entité.", completed: false },
          { id: 'task-cadre-8', name: "Déterminer l'appétence au risque de la société et son niveau de tolérance au risque, avec l'approbation de la direction générale.", completed: false },
          { id: 'task-cadre-9', name: "Évaluer la qualité et l'efficacité du dispositif de contrôle et d'atténuation des risques.", completed: false },
          { id: 'task-cadre-10', name: "Déterminer le niveau de risque résiduel (net) qui subsiste après la mise en œuvre des mesures d'atténuation et de contrôle.", completed: false },
          { id: 'task-cadre-11', name: "Documenter l'évaluation des risques, y compris les études et statistiques utilisées, et consigner les résultats dans un rapport d'évaluation des risques.", completed: false },
          { id: 'task-cadre-12', name: "Élaborer un plan d'action structuré et chronologique pour améliorer le dispositif LBA/FT, incluant objectifs, ressources nécessaires et délais.", completed: false },
          { id: 'task-cadre-13', name: "Mettre à jour régulièrement la classification des risques en fonction des évolutions réglementaires (y compris les publications du GAFI et du CGA), des modifications des produits/services, des changements dans le périmètre de l'assureur, et des résultats des contrôles internes et externes.", completed: false },
          { id: 'task-cadre-14', name: "Intégrer les résultats de l'évaluation nationale et sectorielle des risques dans les processus d'évaluation des risques de la société.", completed: false },
        ],
      },
    ],
  },
  {
    id: 'kyc',
    name: 'Obligations de Vigilance Clientèle (Know Your Customer - KYC)',
    icon: 'Users',
    subCategories: [
      {
        id: 'kyc-identification',
        name: 'Identification et Connaissance du Client (Entrée en Relation et Suivi Continu)',
        icon: 'FileSearch',
        tasks: [
          { id: 'task-kyc-1', name: "Vérifier l'identité complète du souscripteur, de l'assuré et du bénéficiaire (s'ils sont différents), en se basant sur des documents officiels et des sources fiables et indépendantes.", completed: false, documentIds: ['doc-kyc-id'] },
          { id: 'task-kyc-2', name: 'Exiger les copies certifiées conformes des documents d\'identification originaux (carte d\'identité nationale, passeport, carte de séjour), avec la signature du chargé de souscription et la mention "conforme à l\'original".', completed: false, documentIds: ['doc-kyc-id'] },
          { id: 'task-kyc-3', name: "Demander un justificatif de domicile récent (ex: facture d'électricité, gaz, eau).", completed: false },
          { id: 'task-kyc-4', name: "Exiger des informations détaillées sur la profession du client, son secteur d'activité et, si nécessaire, le nom de son employeur.", completed: false },
          { id: 'task-kyc-5', name: "Pour les personnes non émancipées, exiger les documents d'identité et informations de leur représentant légal.", completed: false },
          { id: 'task-kyc-6', name: "S'assurer que la fiche KYC est dûment remplie et signée par le client, et qu'elle contient toutes les informations obligatoires.", completed: false, documentIds: ['doc-kyc-fiche'] },
          { id: 'task-kyc-7', name: "Pour les personnes morales, exiger les statuts, un extrait récent du Registre National des Entreprises (RNE), la liste complète des actionnaires, les documents d'identification des dirigeants, et les documents justifiant les mandats et pouvoirs.", completed: false },
          { id: 'task-kyc-8', name: "Pour les organismes à but non lucratif (OBNL) et les partis politiques, exiger les documents d'identification de l'organisation et des personnes habilitées à réaliser des opérations financières en leur nom.", completed: false },
          { id: 'task-kyc-9', name: "Obtenir des informations sur la nature et l'objectif de la relation d'affaires.", completed: false },
          { id: 'task-kyc-10', name: "S'assurer de l'adéquation des montants des primes payées aux revenus du client.", completed: false },
          { id: 'task-kyc-11', name: "Mener un entretien présentiel avec les clients à risque élevé pour s'informer sur leur activité, l'origine de leurs fonds, leur patrimoine et les objectifs du contrat.", completed: false },
          { id: 'task-kyc-12', name: "Exiger des justificatifs pour les demandes de rachat anticipé, d'avance, de rachat ou de transfert, ainsi que pour les modifications des données client.", completed: false, documentIds: ['doc-specific-ops'] },
          { id: 'task-kyc-13', name: "Vérifier si le client, lorsqu'il est accompagné par d'autres personnes, dispose de son entière liberté de parole ou d'action.", completed: false },
          { id: 'task-kyc-14', name: "Mettre en place des procédures pour l'actualisation des dossiers clients tout au long de la relation d'affaires.", completed: false },
        ],
      },
      {
        id: 'kyc-be',
        name: 'Identification du Bénéficiaire Effectif (BE)',
        icon: 'UserCog',
        tasks: [
          { id: 'task-be-1', name: "Identifier la ou les personnes physiques détenant directement ou indirectement 20% ou plus du capital ou des droits de vote.", completed: false, documentIds: ['doc-beneficiary-id'] },
          { id: 'task-be-2', name: "Si ce critère ne permet pas d'identifier un BE certain, identifier les personnes physiques exerçant un contrôle effectif par tout autre moyen.", completed: false },
          { id: 'task-be-3', name: "Si l'identification reste impossible, identifier la personne physique qui occupe la position de dirigeant principal.", completed: false },
          { id: 'task-be-4', name: "Documenter la démarche progressive entreprise pour l'identification des bénéficiaires effectifs.", completed: false },
          { id: 'task-be-5', name: "S'informer sur la relation entre le souscripteur et les bénéficiaires.", completed: false },
        ],
      },
      {
        id: 'kyc-ppe',
        name: 'Identification des Personnes Politiquement Exposées (PPE)',
        icon: 'Award',
        tasks: [
          { id: 'task-ppe-1', name: "Déterminer si le client, les bénéficiaires effectifs ou leurs proches sont des personnes politiquement exposées (PPE).", completed: false, documentIds: ['doc-ppe-check'] },
          { id: 'task-ppe-2', name: "Obtenir l'accord de la direction générale avant de nouer ou de poursuivre une relation d'affaires avec des PPE.", completed: false },
          { id: 'task-ppe-3', name: "Appliquer une vigilance renforcée à l'égard des PPE.", completed: false },
          { id: 'task-ppe-4', name: "Effectuer un balayage automatique périodique de la base clients par rapport aux listes de PPE.", completed: false },
          { id: 'task-ppe-5', name: "Détecter les PPE non identifiées initialement via un contrôle a posteriori.", completed: false },
        ],
      },
    ],
  },
  {
    id: 'filtrage-surveillance',
    name: 'Filtrage et Surveillance',
    icon: 'SearchCheck',
    subCategories: [
      {
        id: 'filtrage-sanctions',
        name: 'Filtrage des Listes de Sanctions',
        icon: 'Filter',
        tasks: [
          { id: 'task-filtrage-1', name: "Vérifier systématiquement la présence des clients et des bénéficiaires effectifs dans les listes de sanctions nationale (Commission Nationale de Lutte Contre le Terrorisme - CNLCT) et onusienne (Nations Unies - NU).", completed: false, documentIds: ['doc-sanctions-list'] },
          { id: 'task-filtrage-2', name: "Effectuer cette vérification à l'entrée en relation, à chaque nouvelle souscription, en cas de modification des données du client, d'avenant, et pour toute opération pouvant mettre des fonds à disposition du client (indemnisation, terme, rachat).", completed: false },
          { id: 'task-filtrage-3', name: "Procéder à une vérification automatique et continue de l'ensemble de la base clients par rapport aux listes de sanctions, surtout lors des mises à jour.", completed: false },
          { id: 'task-filtrage-4', name: "Analyser la pertinence des correspondances approchantes et confirmer les correspondances.", completed: false },
          { id: 'task-filtrage-5', name: "Pour les correspondances confirmées, suspendre le traitement du dossier et informer immédiatement le responsable de la conformité.", completed: false },
          { id: 'task-filtrage-6', name: "Effectuer des contrôles a posteriori pour détecter les omissions ou les ajouts aux listes après l'entrée en relation.", completed: false },
          { id: 'task-filtrage-7', name: "Vérifier que les parties impliquées dans la transaction, leurs marchandises, leurs moyens de transport et leurs trajets ne figurent pas sur les listes de sanctions relatives à la prolifération des armes de destruction massive.", completed: false },
        ],
      },
      {
        id: 'filtrage-gel',
        name: 'Mesures de Gel des Avoirs',
        icon: 'Lock',
        tasks: [
          { id: 'task-gel-1', name: "Geler les avoirs des personnes ou entités désignées sur les listes de sanctions.", completed: false },
          { id: 'task-gel-2', name: "S'abstenir de mettre à disposition, directement ou indirectement, des fonds ou ressources économiques à toute personne ou entité inscrite sur les listes de gel.", completed: false },
          { id: 'task-gel-3', name: "Gérer les flux financiers en cas de gel, notamment en continuant à accepter les primes des contrats d'assurance non-vie et d'épargne (avec réservation des fonds et information de la CNLCT), en gérant les avenants sans impacter les bénéficiaires/capitaux, en autorisant le dépôt des intérêts/bénéfices sur un compte d'attente, et en déposant tous les fonds gelés sur un compte d'attente.", completed: false, documentIds: ['doc-frozen-contracts'] },
          { id: 'task-gel-4', name: "Obtenir l'autorisation préalable de la CNLCT pour l'indemnisation ou le versement de capital à une personne ou entité désignée.", completed: false },
          { id: 'task-gel-5', name: "Éviter toute disposition indirecte de fonds via des tiers (proches) sans autorisation de la CNLCT.", completed: false },
        ],
      },
    ],
  },
  {
    id: 'detection-declaration',
    name: 'Détection et Déclaration des Opérations Suspectes',
    icon: 'Siren',
    subCategories: [
      {
        id: 'detection-operations',
        name: 'Détection des Opérations Inhabituelles/Suspectes',
        icon: 'Eye',
        tasks: [
          { id: 'task-detection-1', name: "Mettre en place un dispositif de détection des opérations ou transactions suspectes ou inhabituelles basé sur l'identification, la classification, le suivi et le contrôle des risques.", completed: false, documentIds: ['doc-suspicious-behavior'] },
          { id: 'task-detection-2', name: "Analyser les opérations et leur adéquation avec le profil du client.", completed: false },
          { id: 'task-detection-3', name: "Mener des investigations et analyses approfondies pour toute opération considérée inhabituelle.", completed: false },
          { id: 'task-detection-4', name: "Mettre en place un système d'information pour détecter automatiquement les opérations correspondant aux typologies définies et générer des alertes.", completed: false },
          { id: 'task-detection-5', name: "Traiter les alertes générées par le système, vérifier leur pertinence et demander des compléments d'information si nécessaire.", completed: false, documentIds: ['doc-internal-report'] },
          { id: 'task-detection-6', name: "Informer les structures internes intervenantes des clients objets de soupçon et suspendre toute opération avec eux.", completed: false },
        ],
      },
      {
        id: 'declaration-soupcon',
        name: 'Déclaration de Soupçon (DS)',
        icon: 'MailWarning',
        tasks: [
          { id: 'task-ds-1', name: "Procéder à l'analyse et, le cas échéant, à la Déclaration de Soupçon (DS) à la Commission Tunisienne des Analyses Financières (CTAF).", completed: false, documentIds: ['doc-ds-ctaf'] },
          { id: 'task-ds-2', name: "Si le soupçon est en rapport avec le financement du terrorisme, effectuer également une déclaration à la CNLCT.", completed: false, documentIds: ['doc-decl-cnlct'] },
          { id: 'task-ds-3', name: 'Effectuer la déclaration de soupçon via le système d\'information de la CTAF "goAML".', completed: false },
          { id: 'task-ds-4', name: "Procéder à la déclaration même après la réalisation de l'opération ou en cas de tentative de réalisation, même si elle n'a pas eu lieu.", completed: false },
          { id: 'task-ds-5', name: "Déclarer les cas où le client/bénéficiaire effectif est sur une liste de sanctions, les informations d'identification sont fictives, l'opération n'a pas de justification économique apparente, ou l'opération est incohérente avec le profil du client.", completed: false },
          { id: 'task-ds-6', name: "Répondre aux demandes d'information de la CTAF via goAML.", completed: false },
          { id: 'task-ds-7', name: "Informer la CNLCT dans les 8 heures en cas de correspondance confirmée avec une liste de sanctions (nationale ou ONU) et geler les indemnités à payer si applicable.", completed: false },
        ],
      },
    ],
  },
  {
    id: 'controle-reporting',
    name: 'Contrôle Interne et Reporting',
    icon: 'ClipboardCheck',
    subCategories: [
      {
        id: 'controle-interne',
        name: 'Contrôle Interne du Dispositif LBA/FT',
        icon: 'Activity',
        tasks: [
          { id: 'task-ci-1', name: "Mettre en place un système de contrôle interne permettant le suivi des procédures internes, la vérification de leur efficacité, leur évaluation périodique et leur révision si nécessaire.", completed: false },
          { id: 'task-ci-2', name: "Intégrer le contrôle du dispositif LBA/FT dans le programme de travail des missions d'audit interne des départements concernés.", completed: false, documentIds: ['doc-internal-audit'] },
          { id: 'task-ci-3', name: "Auditer le dispositif de contrôle interne pour la gestion du risque de blanchiment d'argent au moins une fois tous les deux ans.", completed: false },
        ],
      },
      {
        id: 'reporting-autorites',
        name: 'Reporting aux Autorités',
        icon: 'FilePieChart',
        tasks: [
          { id: 'task-reporting-1', name: "Adresser au Comité Général des Assurances (CGA), au plus tard un mois après la clôture de chaque exercice, une copie des procédures internes relatives à la LBA/FT ainsi que toutes les modifications qui leur ont été apportées.", completed: false },
          { id: 'task-reporting-2', name: "Soumettre au CGA le rapport d'audit interne sur l'évaluation du système de contrôle interne relatif à la LBA/FT, son efficacité et son adéquation avec le degré d'exposition de la société au risque.", completed: false, documentIds: ['doc-internal-audit'] },
          { id: 'task-reporting-3', name: "Communiquer au CGA les statistiques des Déclarations de Soupçon (DS) effectuées à la CTAF (nombre, nature, sort, montant total, catégories d'assurances concernées, circuits de distribution utilisés).", completed: false, documentIds: ['doc-stats-ds'] },
          { id: 'task-reporting-4', name: "Informer le CGA du nombre, de la nature et des montants des contrats gelés.", completed: false },
          { id: 'task-reporting-5', name: "Adresser au CGA un rapport annuel élaboré par le responsable de la conformité, résumant les résultats de ses travaux en matière de LBA/FT, évaluant la conformité du dispositif, les connaissances des employés, et les sessions de formation réalisées.", completed: false, documentIds: ['doc-annual-compliance'] },
          { id: 'task-reporting-6', name: "Assurer le suivi et l'évaluation de l'exécution des résolutions des instances spécialisées des Nations Unies en rapport avec la lutte contre le terrorisme.", completed: false },
        ],
      },
    ],
  },
  {
    id: 'formation-sensibilisation',
    name: 'Formation et Sensibilisation du Personnel',
    icon: 'Projector',
    subCategories: [
      {
        id: 'formation-programme',
        name: 'Programme de Formation et de Sensibilisation',
        icon: 'BookOpen',
        tasks: [
          { id: 'task-formation-1', name: "Planifier et assurer une formation continue au profit du personnel, notamment ceux chargés des opérations de souscription et d'indemnisation, au moins une fois par an.", completed: false, documentIds: ['doc-training-program'] },
          { id: 'task-formation-2', name: "Les programmes de formation doivent couvrir l'identification, la gestion et le contrôle des risques, les nouvelles techniques, méthodes et tendances en matière de LBA/FT, la détection et la déclaration des opérations et transactions suspectes, ainsi que la manière de traiter avec les clients suspects.", completed: false },
          { id: 'task-formation-3', name: "Évaluer les connaissances des employés relatives aux lois, normes de contrôle et procédures internes en matière de LBA/FT.", completed: false },
        ],
      },
    ],
  },
  {
    id: 'documentation-conservation',
    name: 'Documentation et Conservation des Informations',
    icon: 'Archive',
    subCategories: [
      {
        id: 'documentation-systematique',
        name: 'Documentation et Conservation',
        icon: 'Save',
        tasks: [
          { id: 'task-doc-1', name: "Documenter systématiquement toutes les demandes d'informations, les pièces justificatives reçues et les observations faites.", completed: false },
          { id: 'task-doc-2', name: "Conserver l'ensemble des documents et informations recueillies dans le dossier client (y compris pièces d'identité et contrats) sur support électronique ou matériel pendant une durée minimale de 10 ans à compter de la date de fin du contrat d'assurance.", completed: false, documentIds: ['doc-client-file'] },
          { id: 'task-doc-3', name: "Conserver les documents relatifs aux transactions pendant 10 ans à partir de la date d'exécution de la transaction.", completed: false },
          { id: 'task-doc-4', name: "S'assurer que les documents sont consultables sur demande pour permettre de reconstituer les différentes phases des opérations et d'identifier tous les intervenants.", completed: false },
          { id: 'task-doc-5', name: "Consigner les délibérations et décisions des commissions (ex: commission de discipline) dans des registres spéciaux.", completed: false },
        ],
      },
    ],
  },
];
