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
      article: "Art. 3 — Règlement CGA n°2019-02",
      text: "Les sociétés d'assurances et de réassurances et les intermédiaires en assurances doivent s'assurer, au moyen de documents officiels et autres documents provenant de sources fiables et indépendantes, de l'identité complète du souscripteur, de l'assuré et du bénéficiaire désigné au contrat, leurs activités et leurs adresses.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
    },
    internalProtocol: {
      title: "MAE — Conservation des Documents",
      steps: [
        "Conserver le document expiré dans le dossier client archivé",
        "Le dossier complet doit être conservé 10 ans après la fin de la relation d'affaires"
      ]
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
      article: "Art. 5 — Règlement CGA n°2019-02",
      text: "Créer un dossier pour chaque client afin de conserver une copie de ses documents officiels. Ces documents doivent être vérifiés par l'agent en charge du client et certifiés conformes aux originaux par ce dernier.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
    },
    internalProtocol: {
      title: "MAE — Certification Conforme",
      steps: [
        "L'intervenant doit lui-même certifier la copie conforme",
        "Durée de conservation de 10 ans à partir de la date de transaction ou de fin de relation"
      ]
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
      article: "Art. 3 — Règlement CGA n°2019-02",
      text: "Les sociétés d'assurances... doivent s'assurer, au moyen de documents officiels... de l'identité complète du souscripteur... l'entreprise doit confronter ces informations avec les documents originaux présentés.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
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
    note: "SEUILS DE VIGILANCE :\n- Vie/Capit. Prime unique : > 3.000 DT\n- Vie/Capit. Primes périodiques : > 1.000 DT\n- Primes périodiques cumulées : > 3.000 DT\n- Espèces tous contrats : ≥ 5.000 DT\n\nCHAMPS OBLIGATOIRES PP : Nom prénoms, Naissance (Date/Lieu), Nationalité, CIN/Passeport, Résidence effective, Profession détaillée (éviter termes vagues comme 'commerçant'), Situation financière (origine fonds si étranger/tiers/montant inhabituel), Relation bénéficiaire, Signature.\n\nCHAMPS OBLIGATOIRES PM : Dénomination, Activité + Objet social, Siège social, Identifiant unique (RNE), Copie des statuts obligatoire, Origine des fonds (déclaration), Mandataire (Identité/Domicile/Pouvoir), Dirigeants/Associés principaux, Bénéficiaires/Adhérents.",
    legalBase: {
      article: "LD Août 2025 — Titre 2, Section II",
      text: "La profession : Il est important de renseigner l’activité professionnelle de manière suffisamment claire et précise et non par l’emploi de termes vagues. La situation professionnelle des personnes physiques est, de surcroît, un élément de connaissance nécessaire à la détection d’éventuelles personnes politiquement exposées.",
      link: "/docs/LD - Identification clients Aout 2025.pdf"
    },
    internalProtocol: {
      title: "MAE — Outil RegTools & Risque",
      steps: [
        "Saisie obligatoire dans le SI 'RegTools' (Fiche KYC)",
        "Lancement automatique de l'évaluation du risque BA/FT/PA",
        "S'assurer de l'adéquation primes/revenus lors de la saisie"
      ]
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
      article: "Annexe 1 — Règlement CGA n°2019-02",
      text: "Quant aux personnes incapables de se contracter sauf par l'intermédiaire de leurs tuteurs, il faut demander tous les justificatifs sur celui qui agit en tant que leur représentant légal.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
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
      article: "Art. 3 — Règlement CGA n°2019-02",
      text: "Les sociétés d'assurances... doivent s'assurer de l’identité complète du souscripteur... leurs activités et leurs adresses... au moyen de documents officiels et autres documents provenant de sources fiables et indépendantes.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
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
      "Souscription via courtier : exiger dossier complet de l'intermédiaire (la compagnie reste responsable)"
    ],
    note: "S'applique aussi en cas de suspicion sur la véracité des données. Si dossier courtier incomplet : suspendre le contrat.",
    exception: "Assurances obligatoires uniquement (RC Auto / Incendie pro / collectif employeur) : Conclure le contrat ET informer la CNLCT immédiatement",
    legalBase: {
      article: "LD Août 2025 — Titre 3",
      text: "La distribution des produits d’assurance à travers des intermédiaires... constitue une pratique courante... Toutefois, cette délégation ne libère pas la société d’assurance de sa responsabilité première car elle demeure pleinement responsable du respect de l’ensemble des obligations de vigilance.",
      link: "/docs/LD - Identification clients Aout 2025.pdf"
    },
    internalProtocol: {
      title: "MAE — Sanctions & CNLCT (Siège)",
      steps: [
        "Correspondance confirmée : Déclaration de soupçon immédiate à la CTAF ET à la CNLCT",
        "Suspendre toute opération pendant 5 jours ouvrés dès la notification par le responsable conformité",
        "CNLCT : Si refus ou pas de réponse sous 7 jours, le contrat ne sera PAS renouvelé"
      ]
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
      article: "Art. 5 — Règlement CGA n°2019-02",
      text: "Détecter les personnes, les organisations et les entités dont le lien avec des crimes terroristes est établi... et prendre les mesures nécessaires conformément au décret gouvernemental n°419... portant sur les procédures de mise en œuvre des résolutions prises par les instances onusiennes compétentes.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
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
      article: "Art. 11 — Règlement CGA n°2019-02",
      text: "Informer la direction générale avant le payement des capitaux assurés... réaliser un examen renforcé de la relation contractuelle... envisager de faire une déclaration d'opération suspecte.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
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
      article: "Art. 5 — Règlement CGA n°2019-02",
      text: "Prendre les mesures nécessaires pour geler les fonds visés par lesdites résolutions... relatives à la répression du financement de la prolifération des armes de destruction massive.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
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
      article: "LD Août 2025 — Titre 6",
      text: "La déclaration de soupçon est un mécanisme central... Elle permet d’interrompre des flux financiers douteux, d’éviter la participation involontaire à des activités criminelles, et de protéger les assujettis.",
      link: "/docs/LD - Identification clients Aout 2025.pdf"
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
      article: "Art. 23 — Règlement CGA n°2019-02",
      text: "Mettre en place un système d'information permettant d'identifier les personnes et organisations dont le lien avec des crimes terroristes est établi... et les personnes dont les noms sont inscrits dans la liste nationale.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
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
      article: "Art. 8 — Règlement CGA n°2019-02",
      text: "Ils sont également tenus d'obtenir l’autorisation de la direction générale avant de nouer ou de poursuivre une relation d’affaires avec eux, et exercer une surveillance renforcée et continue de cette relation.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
    },
    internalProtocol: {
      title: "MAE — Protocole de Vérification PPE",
      steps: [
        "Vérifier manuellement sur le SI la liste des PPE (Balayage automatique SI existant)",
        "Vérifier si la profession déclarée (Ambassadeur, mem. Parlement, etc.) attribue le statut",
        "Poser les 2 questions : 'Occupez-vous une fonction publique ?' et 'Un proche est-il PPE ?'",
        "Autorisation de la Direction Générale OBLIGATOIRE pour la poursuite du dossier"
      ]
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
      article: "Art. 12 — Règlement CGA n°2019-02",
      text: "Les sociétés d'assurances... doivent prêter une attention particulière aux opérations ou transactions revêtant un caractère inhabituel... examiner le cadre dans lequel lesdites opérations... sont réalisées... consigner les résultats de cet examen, par écrit.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
    },
    internalProtocol: {
      title: "MAE — Déclaration de Soupçon Interne",
      steps: [
        "Envoyer un email immédiat au responsable conformité (Siège)",
        "Détails requis : Identité complète, nature relation MAE, motifs du soupçon (triggers)",
        "Le responsable conformité informe par email les structures de la suspension obligatoire de 5 jours"
      ]
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
      article: "Art. 3 — Règlement CGA n°2019-02",
      text: "L'identification du bénéficiaire effectif... s'effectue en adoptant la démarche suivante : a- la ou les personnes physiques qui détient(nent)... plus de 20% du capital... b- vérification des personnes physiques... exerçant par tout autre moyen un contrôle effectif... c- lorsqu'aucune personne physique n'est identifiée... le bénéficiaire effectif sera la personne physique qui occupe la position du dirigeant principal.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
    }
  },
  {
    id: "kyc-update-triggers",
    title: "Mise à jour KYC — quand la déclencher ?",
    verdict: "LISTE DES DÉCLENCHEURS",
    color: "green",
    steps: [
      "Déclencher si : modification primes/capital, info déclarée, résiliation/avance, indemnité, identité expirée",
      "Nouveaux déclencheurs : modif statutaire PM, changement de BE, évolution importante flux financiers",
      "Périodicité : Risque élevé (1 an), Risque moyen (2 ans), Risque faible (5 ans)"
    ],
    note: "La mise à jour doit couvrir : situation pro/financière, origine patrimoine, but et nature relation d'affaires.",
    legalBase: {
      article: "LD Août 2025 — Titre 2, Section III",
      text: "Cette actualisation peut être déclenchée à l’occasion d’un événement significatif (modification statutaire, changement de bénéficiaire effectif, évolution importante des flux financiers, etc.), d’un examen périodique prévu selon le niveau de risque associé au client, ou de tout élément nouveau pouvant impacter le profil de risque du client.",
      link: "/docs/LD - Identification clients Aout 2025.pdf"
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
      article: "Art. 7 — Règlement CGA n°2019-02",
      text: "Ils encaissent des primes d'assurances en espèce dont la valeur est supérieure ou égale à cinq mille dinars, même au moyen de plusieurs versements susceptibles de présenter des liens.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
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
      article: "Art. 7 — Règlement CGA n°2019-02",
      text: "Ils utilisent les nouvelles technologies et effectuent des opérations d'assurances sans la présence physique du client.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
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
      article: "Art. 7 — Règlement CGA n°2019-02",
      text: "Ils effectuent des opérations d'assurance avec des personnes résidant dans les pays qui n'appliquent pas ou appliquent de façon insuffisante les normes internationales en matière de lutte contre le blanchiment d'argent et le financement du terrorisme.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
    }
  },
  {
    id: "life-beneficiary-id",
    title: "Bénéficiaire d'un contrat Vie — identification",
    verdict: "VIGILANCE RENFORCÉE — FACTEUR DE RISQUE ÉLEVÉ",
    color: "orange",
    steps: [
      "Désigné nominativement : identité complète dès la souscription + lien avec le souscripteur",
      "Désigné par qualité : infos suffisantes pour identification AU PLUS TARD au versement",
      "Ne pas attendre : anticiper la collecte avant le dénouement si possible"
    ],
    note: "Le bénéficiaire Vie est considéré comme un facteur de risque élevé permanent.",
    legalBase: {
      article: "Art. 10 — Règlement CGA n°2019-02",
      text: "Les sociétés d'assurances... doivent considérer le bénéficiaire du contrat d'assurance vie et de capitalisation comme un facteur de risque élevé... Si le bénéficiaire est nommément désigné au contrat... obtenir son identité complète.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
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
      article: "Art. 11 — Règlement CGA n°2019-02",
      text: "Les sociétés d'assurances... doivent prendre des mesures raisonnables afin de déterminer si le client ou les bénéficiaires... sont des personnes politiquement exposées. Cela devrait se produire au plus tard au moment du versement des capitaux assurés.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
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
      article: "Art. 4 — Règlement CGA n°2019-02",
      text: "Si les sociétés d’assurance... ne parviennent pas à vérifier les informations demandées ou si ces informations sont insuffisantes ou manifestement fictives, ils doivent s'abstenir d’effectuer l'opération... et envisager de faire une déclaration d'opération suspecte.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
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
      article: "Art. 6 — Règlement CGA n°2019-02",
      text: "Les sociétés d'assurance... peuvent appliquer des mesures de vigilance simplifiées à l’égard de certains clients à condition qu’un risque plus faible ait été identifié et évalué... consister notamment en : La vérification de l'identité du client et du bénéficiaire effectif après l'établissement de la relation contractuelle.",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
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
      article: "Art. 13 — Règlement CGA n°2019-02",
      text: "Si l’examen aboutit à des soupçons concernant une opération... ils doivent sans délai prendre les mesures suivantes : Suspendre l'opération ou la transaction temporairement, la déclarer à la CTAF conformément au modèle préétabli. L'obligation de déclaration s'applique également même après la réalisation...",
      link: "/docs/Reglement_CGA_n_2019-02 OCR.pdf"
    }
  },
  {
    id: "be-holding-complex",
    title: "Bénéficiaire effectif — holding / structure complexe",
    verdict: "SUIVRE LA DÉMARCHE PROGRESSIVE",
    color: "orange",
    steps: [
      "Cartographier la structure niveau par niveau",
      "Multiplier les % à chaque niveau pour calculer la détention indirecte",
      "Additionner les participations directes et indirectes",
      "Si total ≥ 20% → BE identifié",
      "Documenter chaque calcul dans la fiche KYC"
    ],
    note: "EXEMPLES DE CALCULS :\n\n- P1 via Holding A (60%) détient 80% de Société W :\n  60% x 80% = 48% → BE ✅\n\n- P2 via Holding B (60%) détient 40% de Société W :\n  60% x 40% x 80% = 19.8% → Pas BE ❌\n\n- P3 (20% direct) + Holding B (40% de Société W) où P3 a 40% :\n  (40% x 40% x 80%) + 20% = 12.8% + 20% = 32.8% → BE ✅",
    legalBase: {
      article: "LD Août 2025 — Titre 1, cas 6",
      text: "La personne P1 détient 60% du capital de la HOLDING A, elle est bénéficiaire effectif de la société W indirectement car elle détient plus de 20% du capital de la société, soit 60% x 80% = 48%.",
      link: "/docs/LD - Identification clients Aout 2025.pdf"
    }
  },
  {
    id: "be-pact-voting",
    title: "Bénéficiaire effectif — pacte d'associés",
    verdict: "VÉRIFIER LE CONTRÔLE EFFECTIF",
    color: "orange",
    steps: [
      "Demander l'existence d'un pacte d'associés / convention de vote",
      "Identifier les signataires du pacte de vote unitaire",
      "Les signataires sont les BE réels (le contrôle prime sur le capital %)",
      "Documenter le type de contrôle exercé sur les organes de gestion"
    ],
    note: "Si plusieurs associés ont 25% mais qu'un sous-groupe a un pacte de vote unitaire, ce sous-groupe contrôle la société.",
    legalBase: {
      article: "LD Août 2025 — Titre 1, cas 7",
      text: "Mme Y et M. Z sont donc les bénéficiaires effectifs réels de la société grâce à cette convention puisqu’ils exercent un contrôle sur les organes de gestion ou de direction de la société.",
      link: "/docs/LD - Identification clients Aout 2025.pdf"
    }
  },
  {
    id: "group-contract-vigilance",
    title: "Contrat collectif — vigilance sur les adhérents",
    verdict: "SOUS CONDITIONS STRICTES",
    color: "green",
    steps: [
      "Vérifier identité du souscripteur (employeur/association) → c'est le CLIENT",
      "Identifier le BE du souscripteur",
      "Adhérents : mesures simplifiées possibles seulement si prévues procédures internes",
      "CONTRATS VIE COLLECTIFS : Identification ADAPTÉE OBLIGATOIRE (pas de simplifié)"
    ],
    legalBase: {
      article: "LD Août 2025 — Titre 4",
      text: "La société d’assurance peut appliquer des mesures de vigilances simplifiées pour les adhérents des contrats groupes à condition qu’elle mentionne cette disposition au niveau de ses procédures internes. Toutefois, dans le cas de l’assurance vie l’assureur devra également mettre en œuvre des mesures d’identification adaptées aux assurés.",
      link: "/docs/LD - Identification clients Aout 2025.pdf"
    }
  },
  {
    id: "broker-subscription",
    title: "Souscription via un intermédiaire / courtier",
    verdict: "VIGILANCE RENFORCÉE OBLIGATOIRE",
    color: "orange",
    steps: [
      "Vérifier existence convention écrite avec clauses LBA-FT",
      "Contrôler qualité et complétude des infos transmises",
      "Respect des délais de transmission obligatoires",
      "Si infos insuffisantes : suspendre ou réaliser vérifications soi-même"
    ],
    note: "La délégation ne libère pas la compagnie de sa responsabilité pleine.",
    legalBase: {
      article: "LD Août 2025 — Titre 3",
      text: "Cette délégation ne libère pas la société d’assurance de sa responsabilité première car elle demeure pleinement responsable du respect de l’ensemble des obligations de vigilance qui lui incombent.",
      link: "/docs/LD - Identification clients Aout 2025.pdf"
    }
  },
  {
    id: "suspicious-declaration-proof",
    title: "Déclaration de soupçon — niveau de preuve",
    verdict: "DÉCLARER ET BLOQUER",
    color: "red",
    steps: [
      "Indices suffisants = DS obligatoire (Pas besoin de preuve formelle)",
      "Déclencher si : identité douteuse, comportement inhabituel, montage complexe unjustified",
      "Timing : dès détection suspecte (avant ou après opération)",
      "Confidentialité absolue : ne jamais informer le client"
    ],
    note: "Attendre une preuve formelle est une erreur réglementaire.",
    legalBase: {
      article: "LD Août 2025 — Titre 6",
      text: "Il importe peu que le soupçon repose sur une preuve formelle : la simple présence d’indices concordants, non justifiés dans le cadre normal de la relation d’affaires, suffit à fonder une déclaration de soupçon.",
      link: "/docs/LD - Identification clients Aout 2025.pdf"
    },
    isFrequent: true
  }
];
