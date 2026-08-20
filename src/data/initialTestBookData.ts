import { TestCase, Anomaly, TestBookMetadata } from "@/types/testBook";

export const INITIAL_METADATA: TestBookMetadata = {
  project: "RegTools — Application de Conformité",
  editor: "MAE",
  url: "https://regtools.mae.tn/RegTools",
  environment: "Production / Recette",
  generationDate: "20/08/2026",
  tester: "Equipe Conformité"
};

export const INITIAL_TEST_CASES: TestCase[] = [
  {
    id: "T-001",
    module: "Reporting",
    title: "Accès au module Reporting",
    steps: "1. Naviguer vers le module Reporting\n2. Vérifier le chargement de la page",
    expectedResult: "Le module Reporting s'affiche correctement",
    status: "OK",
    linkedAnomaly: "",
    comment: ""
  },
  {
    id: "T-002",
    module: "Reporting",
    title: "Génération rapport depuis liste clients",
    steps: "1. Accéder à la liste clients\n2. Sélectionner des clients\n3. Lancer la génération du rapport",
    expectedResult: "Rapport généré avec succès",
    status: "OK",
    linkedAnomaly: "ANO-001",
    comment: ""
  },
  {
    id: "T-003",
    module: "Reporting",
    title: "Colonne 'Niveau de risque' dans le rapport (ANO-001)",
    steps: "1. Ouvrir le rapport généré\n2. Vérifier la présence de la colonne 'Niveau de risque'",
    expectedResult: "La colonne 'Niveau de risque' est présente et renseignée",
    status: "OK",
    linkedAnomaly: "ANO-001",
    comment: "L'état est généré à partir de la liste clients et non pas à partir du module Reporting."
  },
  {
    id: "T-004",
    module: "Alertes / Pagination",
    title: "Accès tableau de traitement des alertes",
    steps: "1. Naviguer vers le module Alertes\n2. Vérifier le chargement du tableau",
    expectedResult: "Le tableau des alertes s'affiche avec les colonnes attendues",
    status: "OK",
    linkedAnomaly: "",
    comment: ""
  },
  {
    id: "T-005",
    module: "Alertes / Pagination",
    title: "Agent éditeur visible — Page 1",
    steps: "1. Observer la colonne 'Agent éditeur' sur la page 1\n2. Vérifier que les agents sont affichés",
    expectedResult: "La colonne 'Agent éditeur' est renseignée sur la page 1",
    status: "OK",
    linkedAnomaly: "ANO-002",
    comment: ""
  },
  {
    id: "T-006",
    module: "Alertes / Pagination",
    title: "Agent éditeur renseigné — (ANO-002)",
    steps: "1. Observer la colonne 'Agent éditeur'\n2. Vérifier que les agents restent affichés",
    expectedResult: "La colonne 'Agent éditeur' reste renseignée",
    status: "KO",
    linkedAnomaly: "ANO-002",
    comment: ""
  },
  {
    id: "T-007",
    module: "KYC / PEP",
    title: "Accès à la liste clients",
    steps: "1. Naviguer vers la liste clients\n2. Vérifier le chargement",
    expectedResult: "La liste clients s'affiche correctement",
    status: "OK",
    linkedAnomaly: "",
    comment: ""
  },
  {
    id: "T-008",
    module: "KYC / PEP",
    title: "Filtre PEP dans liste clients (ANO-003)",
    steps: "1. Appliquer le filtre PEP sur la liste clients\n2. Vérifier les résultats filtrés",
    expectedResult: "La liste ne montre que les clients identifiés PEP",
    status: "KO",
    linkedAnomaly: "ANO-003",
    comment: ""
  },
  {
    id: "T-009",
    module: "KYC / PEP",
    title: "Question PEP dans fiche KYC client (ANO-003)",
    steps: "1. Ouvrir la fiche KYC d'un client\n2. Chercher la section PEP\n3. Vérifier l'indicateur PEP",
    expectedResult: "L'indicateur/question PEP est visible et fonctionnel dans la fiche KYC",
    status: "KO",
    linkedAnomaly: "ANO-003",
    comment: ""
  },
  {
    id: "T-010",
    module: "KYC / PEP",
    title: "Indicateur PEP visible dans liste clients (ANO-003)",
    steps: "1. Observer la liste clients\n2. Vérifier la présence d'une colonne ou badge PEP",
    expectedResult: "Un badge ou indicateur PEP est visible dans la liste clients",
    status: "KO",
    linkedAnomaly: "ANO-003",
    comment: ""
  },
  {
    id: "T-012",
    module: "Navigation",
    title: "Accès module : Clients / KYC",
    steps: "1. Cliquer sur 'Clients' ou 'KYC' dans le menu\n2. Vérifier le chargement",
    expectedResult: "Le module Clients/KYC s'affiche sans erreur",
    status: "Non encore testé",
    linkedAnomaly: "",
    comment: ""
  },
  {
    id: "T-013",
    module: "Navigation",
    title: "Accès module : Alertes",
    steps: "1. Cliquer sur 'Alertes' dans le menu\n2. Vérifier le chargement",
    expectedResult: "Le module Alertes s'affiche sans erreur",
    status: "Non encore testé",
    linkedAnomaly: "",
    comment: ""
  },
  {
    id: "T-014",
    module: "Navigation",
    title: "Accès module : Reporting",
    steps: "1. Cliquer sur 'Reporting' dans le menu\n2. Vérifier le chargement",
    expectedResult: "Le module Reporting s'affiche sans erreur",
    status: "Non encore testé",
    linkedAnomaly: "",
    comment: ""
  },
  {
    id: "T-015",
    module: "Export",
    title: "Présence bouton Export (Excel/PDF)",
    steps: "1. Naviguer vers une liste (clients ou alertes)\n2. Chercher un bouton Export/Excel/PDF\n3. Vérifier sa présence",
    expectedResult: "Un bouton d'export est visible et cliquable",
    status: "Non encore testé",
    linkedAnomaly: "",
    comment: ""
  },
  {
    id: "T-016",
    module: "Création",
    title: "Présence bouton Nouveau/Créer client",
    steps: "1. Naviguer vers la liste clients\n2. Chercher un bouton 'Nouveau' ou 'Créer'\n3. Vérifier sa présence",
    expectedResult: "Un bouton de création client est visible et cliquable",
    status: "Non encore testé",
    linkedAnomaly: "",
    comment: ""
  },
  {
    id: "T-017",
    module: "Stabilité",
    title: "Absence d'erreurs JavaScript console",
    steps: "1. Naviguer sur les pages principales\n2. Ouvrir la console développeur\n3. Vérifier l'absence d'erreurs JS",
    expectedResult: "Aucune erreur JavaScript dans la console",
    status: "Non encore testé",
    linkedAnomaly: "",
    comment: ""
  },
  {
    id: "T-018",
    module: "Scoring / Correspondances",
    title: "Taux de correspondance affiché à 100% sans prise en compte du pays",
    steps: "1. Ouvrir une fiche client\n2. Lancer une recherche de correspondance\n3. Observer le taux affiché\n4. Vérifier si le champ 'Pays' est pris en compte dans le calcul",
    expectedResult: "Le score de correspondance doit diminuer si le pays ne correspond pas",
    status: "KO",
    linkedAnomaly: "ANO-004",
    comment: ""
  },
  {
    id: "T-019",
    module: "Scoring / Correspondances",
    title: "Taux de correspondance affiché à 100% sans prise en compte de la date de naissance",
    steps: "1. Ouvrir une fiche client\n2. Lancer une recherche de correspondance\n3. Observer le taux affiché\n4. Vérifier si la 'Date de naissance' est prise en compte dans le calcul",
    expectedResult: "Le score de correspondance doit diminuer si la date de naissance ne correspond pas",
    status: "KO",
    linkedAnomaly: "ANO-004",
    comment: ""
  },
  {
    id: "T-020",
    module: "Interface / Localisation",
    title: "Composants en anglais — impact traduction navigateur (ANO-005)",
    steps: "1. Naviguer dans les différents modules de l'application\n2. Identifier les libellés, boutons, messages en anglais\n3. Activer Google Traduction dans le navigateur\n4. Observer le comportement de l'interface",
    expectedResult: "Tous les composants sont affichés en français ; aucun dysfonctionnement lié à la traduction navigateur",
    status: "KO",
    linkedAnomaly: "ANO-005",
    comment: "Plusieurs éléments restent en anglais ; l'activation de Google Traduction provoque des bugs d'affichage et nécessite un vidage de cache."
  },
  {
    id: "T-021",
    module: "Calcul du Risque",
    title: "Calcul du score de risque — cas non calculés (ANO-006)",
    steps: "1. Ouvrir plusieurs fiches clients de profils variés\n2. Vérifier la présence et la valeur du score de risque\n3. Identifier les fiches où le score est absent ou nul\n4. Tenter de forcer le recalcul si option disponible",
    expectedResult: "Le score de risque est calculé et affiché pour tous les profils clients",
    status: "KO",
    linkedAnomaly: "ANO-006",
    comment: "Le score de risque n'est pas calculé dans certains cas ; aucun message d'erreur affiché — cas de reproduction non encore systématisés."
  },
  {
    id: "T-022",
    module: "Alertes / Traitement",
    title: "Traitement des alertes anciennes — boutons d'action (ANO-007)",
    steps: "1. Filtrer les alertes par date pour afficher les plus anciennes\n2. Ouvrir une alerte ancienne\n3. Vérifier la présence des boutons d'action (Valider, Rejeter, Commenter…)\n4. Tenter d'effectuer un traitement",
    expectedResult: "Les boutons d'action sont actifs pour toutes les alertes, quelle que soit leur ancienneté",
    status: "KO",
    linkedAnomaly: "ANO-007",
    comment: "Les alertes anciennes n'affichent pas de boutons d'action exploitables — elles ne peuvent pas être traitées ni clôturées par l'équipe conformité."
  },
  {
    id: "T-023",
    module: "Scoring / Correspondances",
    title: "Redondance des correspondances — même client (ANO-008)",
    steps: "1. Rechercher un client dans le module des correspondances\n2. Observer la liste des résultats retournés\n3. Vérifier l'unicité des entrées pour un même client\n4. Comparer les lignes doublonnées",
    expectedResult: "Chaque client n'apparaît qu'une seule fois dans la liste des correspondances",
    status: "KO",
    linkedAnomaly: "ANO-008",
    comment: "Le même client apparaît plusieurs fois dans les correspondances sans raison distincte — redondance confirmée, cause non identifiée."
  },
  {
    id: "T-024",
    module: "Alertes",
    title: "Alertes Sanctions / PEP",
    steps: "1. Observer le module de filtrage des alertes PEP et Sanctions\n2. Vérifier la volumétrie et la cohérence avec les données sources",
    expectedResult: "Nombre des alertes devrait être fondé sur la base des données existants",
    status: "KO",
    linkedAnomaly: "ANO-009",
    comment: "Volume disproportionné d'alertes générées (ex: 8759 PEP, Sanctionnés de 80 à 500 en 24H)."
  }
];

export const INITIAL_ANOMALIES: Anomaly[] = [
  {
    id: "ANO-003",
    module: "KYC / PEP",
    description: "L'identification PEP n'est pas générée depuis la fiche KYC ni via le filtrage liste clients (= source pas très fiable)",
    businessImpact: "Détection des Personnes Exposées Politiquement (Sources manquent de fiabilité)",
    priority: "CRITIQUE",
    linkedTest: "T-008 / T-009 / T-010"
  },
  {
    id: "ANO-004",
    module: "Scoring / Correspondances",
    description: "Le taux de correspondance est affiché à 100% sans que les champs Genre, Pays et/ou Date de naissance soient réellement pris en compte dans le calcul du score",
    businessImpact: "Faux positifs de correspondance — des profils non concordants sont présentés comme 100% correspondants, risque de validation erronée d'une alerte",
    priority: "CRITIQUE",
    linkedTest: "T-018 / T-019"
  },
  {
    id: "ANO-005",
    module: "Interface / Localisation",
    description: "Certains composants de l'application sont affichés en anglais alors que d'autres sont en français. Les utilisateurs recourent à la traduction automatique du navigateur (Google Traduction), ce qui provoque des dysfonctionnements de l'interface et les oblige à vider le cache à chaque utilisation.",
    businessImpact: "Expérience utilisateur dégradée — risque d'erreur de saisie/interprétation et perte de productivité.",
    priority: "HAUTE",
    linkedTest: "T-020"
  },
  {
    id: "ANO-006",
    module: "Calcul du Risque",
    description: "Le score de risque ne se calcule pas dans certains cas non encore identifiés avec précision. Le champ reste vide ou affiche une valeur nulle sans message d'erreur explicite.",
    businessImpact: "Profils clients non scorés ; impossibilité d'assurer la surveillance et la classification réglementaire obligatoire.",
    priority: "CRITIQUE",
    linkedTest: "T-021"
  },
  {
    id: "ANO-007",
    module: "Alertes / Traitement",
    description: "Certaines alertes anciennes (antérieures à une date non déterminée) ne peuvent pas être traitées par l'équipe conformité : le bouton enregistrement dans ce cas n'actionne rien.",
    businessImpact: "Alertes historiques non traitables ; obligations de traitement et de clôture réglementaires non respectées.",
    priority: "HAUTE",
    linkedTest: "T-022"
  },
  {
    id: "ANO-008",
    module: "Scoring / Correspondances",
    description: "Redondance des correspondances pour le même client. Le même client apparaît plusieurs fois dans la liste des résultats sans motif distinct.",
    businessImpact: "Surcharge de travail pour les analystes conformité et risque de double traitement incohérent.",
    priority: "HAUTE",
    linkedTest: "T-023"
  },
  {
    id: "ANO-002",
    module: "Alertes / Pagination",
    description: "La colonne 'Agent éditeur' est renseignée sur la première page mais devient vide ou non persistée lors de la navigation / pagination.",
    businessImpact: "Perte de traçabilité des actions utilisateurs et de l'attribution des alertes.",
    priority: "HAUTE",
    linkedTest: "T-006"
  },
  {
    id: "ANO-009",
    module: "Alertes",
    description: "Nombre des alertes Sanctions / PEP extrêmement volumineux et incohérent (Exemple : 8759 PEP, Sanctionnés passant de 80 à 500 en 24h sans corrélation avec la base source).",
    businessImpact: "Impossibilité de traitement opérationnel vu le volume ; Risque majeur de sanctions en cas de contrôle réglementaire.",
    priority: "HAUTE",
    linkedTest: "T-024"
  }
];
