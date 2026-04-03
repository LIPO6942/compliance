import { QuickResponseFiche } from "@/types/quick-response";

export const quickResponseFiches: QuickResponseFiche[] = [
  {
    id: "cin-expired",
    title: "CIN / Passeport / Carte de séjour expirée",
    verdict: "REFUSER",
    color: "red",
    steps: [
      "Ne pas souscrire le contrat",
      "Informer l'agent que le document original valide est obligatoire",
      "Inviter le client à revenir avec un document en cours de validité"
    ],
    legalBase: {
      article: "Art. 3 Règlement CGA n°2019-02",
      text: "Conditions d'identification du client et vérification de son identité au moyen d'un document original en cours de validité avec photographie.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=12"
    },
    isFrequent: true
  },
  {
    id: "document-not-certified",
    title: "Document non certifié ou mal certifié",
    verdict: "REFUSER",
    color: "red",
    steps: [
      "Rejeter la copie non conforme",
      "La certification doit être apposée par le chargé de souscription : nom + prénom + signature + mention 'conforme à l'original'",
      "Ne pas souscrire tant que la certification n'est pas correcte"
    ],
    note: "Toute rature ou surcharge entraîne le rejet automatique",
    legalBase: {
      article: "Art. 3 Règlement CGA n°2019-02",
      text: "Exigence de certification des copies par rapport aux originaux par le personnel habilité de l'assureur.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=14"
    },
    isFrequent: true
  },
  {
    id: "photo-not-conforming",
    title: "Photo non conforme à l'apparence physique",
    verdict: "REFUSER",
    color: "red",
    steps: [
      "Signaler l'anomalie au responsable conformité",
      "Ne pas souscrire le contrat",
      "Demander un document d'identité dont la photo correspond à l'apparence physique réelle du souscripteur"
    ],
    legalBase: {
      article: "Art. 3 Règlement CGA n°2019-02",
      text: "Nécessité d'une concordance parfaite entre le document d'identité et la personne physique présente.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=15"
    }
  },
  {
    id: "kyc-missing-data",
    title: "Données KYC manquantes / formulaire incomplet",
    verdict: "REFUSER",
    color: "red",
    steps: [
      "Ne pas souscrire le contrat",
      "Identifier précisément les champs obligatoires manquants",
      "Demander au client de compléter les informations avant tout retour"
    ],
    note: "SEUILS DE VIGILANCE :\n- Vie/Capit. Prime unique : > 3.000 DT\n- Vie/Capit. Primes périodiques : > 1.000 DT\n- Primes périodiques cumulées : > 3.000 DT\n- Espèces tous contrats : ≥ 5.000 DT\n\nCHAMPS OBLIGATOIRES PP : Nom/Prénom, Naissance (Date/Lieu), Nationalité, CIN/Passeport, Résidence effective, Profession, Relation bénéficiaire, Signature.\nCHAMEPS OBLIGATOIRES PM : Dénomination, Activité, Siège social, Identifiant unique (RNE), Mandataire (Identité/Domicile/Pouvoir), Dirigeants/Associés principaux, Bénéficiaires/Adhérents.",
    legalBase: {
      article: "Art. 3, 7 et Annexe 1 Règlement CGA n°2019-02",
      text: "L'obligation de vigilance impose la collecte complète des données KYC obligatoires et le respect des seuils de vigilance.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=16"
    },
    isFrequent: true
  },
  {
    id: "legal-representative",
    title: "Représentant légal / Mandataire",
    verdict: "ACCEPTER SOUS CONDITION",
    color: "green",
    steps: [
      "Exiger les documents d'identification du représentant légal",
      "Exiger le document prouvant la représentation légale (mandat, jugement...)",
      "Pour les mineurs et incapables majeurs : exiger TOUS les justificatifs de représentation (pas seulement CIN)",
      "Renseigner la fiche KYC avec les données du représentant"
    ],
    legalBase: {
      article: "Art. 3 et Annexe 1 Règlement CGA n°2019-02",
      text: "Vérification des pouvoirs et de l'identité du représentant agissant pour le compte d'autrui.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=18"
    },
    isFrequent: true
  },
  {
    id: "address-inconsistent",
    title: "Adresses incohérentes entre documents",
    verdict: "SUSPENDRE",
    color: "orange",
    steps: [
      "Signaler l'incohérence au responsable conformité",
      "Chercher une explication plausible auprès du client",
      "Si explication satisfaisante : documenter et poursuivre",
      "Si pas d'explication plausible : ne pas souscrire"
    ],
    legalBase: {
      article: "Art. 3 Règlement CGA n°2019-02",
      text: "Obligation de lever les doutes en cas d'incohérence manifeste entre les justificatifs fournis.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=20"
    }
  },
  {
    id: "sanction-list-subscription",
    title: "Client sur liste de sanctions — à la souscription",
    verdict: "BLOQUER",
    color: "red",
    steps: [
      "Continuer à recevoir le dossier client",
      "Suspendre immédiatement le traitement",
      "Alerter le responsable conformité par téléphone immédiatement",
      "Ne rien faire d'autre sans instruction du responsable"
    ],
    note: "S'applique aussi en cas de suspicion sur la véracité ou pertinence des données d'identification.",
    exception: "Assurances obligatoires uniquement (RC Auto / Incendie pro / collectif employeur) : Conclure le contrat ET informer la CNLCT immédiatement",
    legalBase: {
      article: "Art. 10 Décret n°2019-419 + Art. 3 et 13 Règlement CGA n°2019-02",
      text: "Interdiction de mise à disposition de fonds ou ressources économiques aux personnes listées.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=45"
    },
    isFrequent: true
  },
  {
    id: "sanction-list-ongoing",
    title: "Client sur liste de sanctions — en cours de relation",
    verdict: "GEL IMMÉDIAT",
    color: "red",
    steps: [
      "Ne pas résilier ni suspendre le contrat existant",
      "Geler immédiatement les avoirs dans les 8h suivant la publication CNLCT",
      "Déposer les fonds gelés dans un compte suspens",
      "Informer la CNLCT dans les 24h (montant gelé, date et heure du gel)",
      "Au premier renouvellement : demander autorisation à la CNLCT"
    ],
    note: "Les primes continuent d'être acceptées pendant la période de gel.",
    legalBase: {
      article: "Art. 8 Décret n°2019-419",
      text: "Mise en œuvre sans délai des mesures de gel administratif des fonds.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=47"
    },
    isFrequent: true
  },
  {
    id: "indemnity-sanctioned",
    title: "Indemnisation — bénéficiaire listé ou proche listé",
    verdict: "SUSPENDRE L'INDEMNISATION",
    color: "red",
    steps: [
      "Suspendre l'indemnisation",
      "Le responsable conformité demande l'autorisation à la CNLCT",
      "Attendre la réponse (positive ou 7 jours sans réponse = gel maintenu)"
    ],
    exception: "Tiers de bonne foi non listé (RC Gen, RC Auto, TD Emprunteur) : informer CNLCT + indemniser tiers.",
    legalBase: {
      article: "Art. 10 Décret n°2019-419",
      text: "L'indemnisation de personnes listées est soumise à autorisation préalable de la CNLCT.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=49"
    }
  },
  {
    id: "freeze-non-life",
    title: "Gel — Contrat Non Vie",
    verdict: "GEL PARTIEL",
    color: "red",
    steps: [
      "Geler : Ristourne en cas de résiliation anticipée",
      "Geler : Indemnité suite à sinistre",
      "NE PAS geler : Prime perçue par l'assureur",
      "Déposer les montants gelés dans un compte suspens"
    ],
    legalBase: {
      article: "Lignes directrices CGA/CNLCT juin 2025",
      text: "Détail de l'application du gel administratif aux produits d'assurance dommages.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=55"
    }
  },
  {
    id: "freeze-life",
    title: "Gel — Contrat Vie",
    verdict: "GEL TOTAL",
    color: "red",
    steps: [
      "Tout est gelé : capital / rente / rachat / avance",
      "Les intérêts générés sont autorisés mais doivent aussi être gelés",
      "Déposer en compte suspens",
      "Les avenants peuvent être gérés sans transfert de fonds"
    ],
    note: "Les primes continuent d'être acceptées.",
    legalBase: {
      article: "Lignes directrices CGA/CNLCT juin 2025",
      text: "Application stricte du gel total aux produits d'assurance vie et de capitalisation.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=57"
    }
  },
  {
    id: "false-positive",
    title: "Faux positif — similitude de noms",
    verdict: "VÉRIFIER AVANT TOUTE DÉCISION",
    color: "orange",
    steps: [
      "Vérifier soigneusement les données (homonymie ?)",
      "Si erreur confirmée : le client saisit la CNLCT par écrit",
      "Si la CNLCT approuve : levée du gel dans les 3 jours ouvrables"
    ],
    legalBase: {
      article: "Art. 8 Décret n°2019-419",
      text: "Procédure de traitement des réclamations liées aux mesures de gel administratif.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=58"
    }
  },
  {
    id: "ppe-detected",
    title: "PPE détectée",
    verdict: "SUSPENDRE",
    color: "orange",
    steps: [
      "Compléter la fiche KYC",
      "NE PAS créer la police d'assurance",
      "Remonter le dossier au responsable conformité immédiatement",
      "Attendre l'autorisation de la Direction Générale avant toute suite"
    ],
    note: "S'applique aussi aux proches et liens d'affaires étroits.",
    legalBase: {
      article: "Art. 7, 8 et 9 Règlement CGA n°2019-02",
      text: "Mesures de vigilance complémentaires pour les Personnes Politiquement Exposées.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=30"
    },
    isFrequent: true
  },
  {
    id: "suspicious-operation",
    title: "Opération suspecte ou inhabituelle",
    verdict: "DÉCLARER EN INTERNE",
    color: "orange",
    steps: [
      "Envoyer un email au responsable conformité avec identité, nature relation, éléments déclencheurs",
      "Ne rien dire au client (confidentialité absolue)",
      "Attendre l'instruction du responsable"
    ],
    note: "L'examen de l'opération inhabituelle doit être consigné par écrit et tenu à disposition des autorités.",
    legalBase: {
      article: "Art. 12 et 13 Règlement CGA n°2019-02 + Décision CTAF n°2024-01",
      text: "Obligation de signalement interne, de consignation écrite et de déclaration de soupçon.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=65"
    },
    isFrequent: true
  },
  {
    id: "beneficial-owner-pm",
    title: "Bénéficiaire effectif non identifiable — PM",
    verdict: "SUIVRE LA DÉMARCHE PROGRESSIVE",
    color: "orange",
    steps: [
      "Identifier les PP détenant ≥ 20% du capital ou droits de vote",
      "Si doute : identifier les PP contrôlant effectivement la PM",
      "Si toujours rien : identifier le dirigeant principal",
      "Documenter chaque étape (email, fiche KYC, écrit prouvant la démarche)"
    ],
    legalBase: {
      article: "Décret n°2019-54 du 21/01/2019",
      text: "Procédure d'identification en cascade du bénéficiaire effectif des personnes morales.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=25"
    }
  },
  {
    id: "kyc-update-triggers",
    title: "Mise à jour KYC — quand la déclencher ?",
    verdict: "LISTE DES DÉCLENCHEURS",
    color: "green",
    steps: [
      "Déclencher si : modification primes, capital assuré, info déclarée, demande résiliation/avance, indemnité, identité expirée",
      "Périodicité : Risque élevé (1 an), Risque moyen (2 ans), Risque faible (5 ans)",
      "Au renouvellement : vérifier la cohérence avec la fiche KYC"
    ],
    legalBase: {
      article: "Art. 5 Règlement CGA n°2019-02",
      text: "Mise à jour périodique et ponctuelle de la connaissance client.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=22"
    }
  },
  {
    id: "cash-payment-threshold",
    title: "Primes en espèces ≥ 5.000 DT",
    verdict: "VIGILANCE RENFORCÉE OBLIGATOIRE",
    color: "orange",
    steps: [
      "Appliquer les mesures de vigilance renforcée (Art. 7)",
      "Obtenir des informations sur l'origine des fonds",
      "Exiger les justificatifs de l'origine des fonds",
      "Transmettre au responsable conformité"
    ],
    note: "Applicable même si le montant est atteint via plusieurs versements liés entre eux.",
    legalBase: {
      article: "Art. 7 Règlement CGA n°2019-02",
      text: "Vigilance renforcée pour les transactions en cash dépassant les seuils fixés.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=28"
    },
    isFrequent: true
  },
  {
    id: "remote-subscription",
    title: "Souscription sans présence physique (Vente à distance)",
    verdict: "VIGILANCE RENFORCÉE OBLIGATOIRE",
    color: "orange",
    steps: [
      "Évaluer les risques BA/FT liés au canal de vente",
      "Appliquer les mesures de vigilance renforcée (Art. 7)",
      "Obtenir des informations supplémentaires sur client et origine fonds",
      "Soumettre au responsable conformité"
    ],
    legalBase: {
      article: "Art. 7 et 9 Règlement CGA n°2019-02",
      text: "Vigilance accrue pour les relations d'affaires établies à distance.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=32"
    }
  },
  {
    id: "non-cooperative-country",
    title: "Client pays non coopératif / haut risque",
    verdict: "VIGILANCE RENFORCÉE OBLIGATOIRE",
    color: "orange",
    steps: [
      "Vérifier la liste CTAF à jour (n°2025/254 du 06/11/2025)",
      "Appliquer les mesures de vigilance renforcée (Art. 7)",
      "Obtenir des informations supplémentaires sur l'origine des fonds",
      "Transmettre au responsable conformité pour analyse approfondie"
    ],
    note: "S'applique aussi aux nationaux de ces pays résidant en Tunisie.",
    legalBase: {
      article: "Art. 7 Règlement CGA n°2019-02",
      text: "Mesures spécifiques pour les zones géographiques à risque élevé.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=34"
    }
  },
  {
    id: "life-beneficiary-id",
    title: "Bénéficiaire d'un contrat Vie — identification",
    verdict: "VIGILANCE RENFORCÉE — FACTEUR DE RISQUE ÉLEVÉ",
    color: "orange",
    steps: [
      "Désigné nominativement : identité complète dès la souscription",
      "Désigné par qualité : infos suffisantes pour identification au versement",
      "Si risque élevé : vigilance renforcée au moment du paiement"
    ],
    note: "Le bénéficiaire Vie est considéré comme un facteur de risque élevé permanent.",
    legalBase: {
      article: "Art. 10 Règlement CGA n°2019-02",
      text: "Identification obligatoire des bénéficiaires et bénéficiaires effectifs en assurance vie.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=36"
    }
  },
  {
    id: "ppe-payout-life",
    title: "PPE détectée dans un contrat Vie — au versement",
    verdict: "BLOQUER — Informer la DG avant tout paiement",
    color: "red",
    steps: [
      "Vérifier si PPE au plus tard au versement des capitaux",
      "Informer la Direction Générale AVANT le paiement",
      "Réaliser un examen renforcé de la relation",
      "Envisager une DS à la CTAF",
      "Ne pas payer sans autorisation DG"
    ],
    legalBase: {
      article: "Art. 11 Règlement CGA n°2019-02",
      text: "Contrôle PPE au dénouement du contrat et autorisation DG obligatoire.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=38"
    }
  },
  {
    id: "insufficient-info-fictitious",
    title: "Informations insuffisantes ou manifestement fictives",
    verdict: "REFUSER + ENVISAGER UNE DS",
    color: "red",
    steps: [
      "S'abstenir de toute opération",
      "Envisager immédiatement une DS à la CTAF",
      "Informer le responsable conformité"
    ],
    note: "Diffère des simples données manquantes : ici suspicion d'identité fictive ou incohérences graves.",
    legalBase: {
      article: "Art. 4 Règlement CGA n°2019-02",
      text: "Obligation de refus de service en cas d'impossibilité d'identifier le client.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=40"
    }
  },
  {
    id: "low-risk-simplified",
    title: "Client à risque faible — mesures simplifiées",
    verdict: "SOUS CONDITIONS STRICTES",
    color: "green",
    steps: [
      "Vérifier identification risque faible formelle et cohérente (ENR)",
      "Identification possible APRES établissement contrat",
      "Mises à jour moins fréquentes autorisées",
      "INTERDIT si soupçon BA/FT ou risque élevé détecté"
    ],
    legalBase: {
      article: "Art. 6 Règlement CGA n°2019-02",
      text: "Conditions réglementaires fixant le recours aux mesures de vigilance simplifiées.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=25"
    }
  },
  {
    id: "immediate-suspicious-action",
    title: "Opération suspecte — action immédiate",
    verdict: "SUSPENDRE + DÉCLARER",
    color: "red",
    steps: [
      "Suspendre l'opération temporairement",
      "Déclarer à la CTAF immédiatement (modèle règlementaire)",
      "Confidentialité absolue : ne pas informer le client",
      "S'applique aussi aux tentatives non réalisées"
    ],
    note: "S'applique même après réalisation si de nouveaux faits apparaissent.",
    legalBase: {
      article: "Art. 13 Règlement CGA n°2019-02",
      text: "Procédure de déclaration de soupçon et mesures conservatoires.",
      link: "/docs/manuel-mae-assurances-v2026-3.pdf#page=68"
    }
  }
];
