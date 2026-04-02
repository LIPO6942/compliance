
export interface DocumentItem {
  id: string;
  name: string;
  description?: string;
  requirements: string[];
  alertType?: string; // New: 'fraude', 'conformite', 'expiration', etc.
}

export interface EntityRequirement {
  id: string;
  type: string;
  icon: string; // Lucide icon name
  description: string;
  documents: DocumentItem[];
}

export const ENTITY_REQUIREMENTS: EntityRequirement[] = [
  {
    id: "physique",
    type: "Personnes Physiques",
    icon: "User",
    description: "Documents requis pour l'identification des clients particuliers.",
    documents: [
      {
        id: "cin-pp",
        name: "Copie de la Carte d'Identité Nationale (CIN) / Passeport / Carte de séjour",
        requirements: [
          "Doit être certifiée conforme à l'original.",
          "La certification se fait en apposant le nom et prénom de l'agent.",
          "Signature de l'agent certificateur obligatoire.",
          "Mention obligatoire : « conforme à l'original »."
        ],
        alertType: "Alerte Fraude Documentaire"
      },
      {
        id: "kyc-pp",
        name: "Fiche KYC Personne Physique",
        requirements: [
          "Doit être signée par le client.",
          "Toutes les sections doivent être dûment complétées."
        ],
        alertType: "Alerte Non-Conformité"
      },
      {
        id: "kyc-update-pp",
        name: "Fiche KYC actualisée",
        requirements: [
          "Requise systématiquement en cas de modification des informations.",
          "Doit être signée par le client."
        ],
        alertType: "Alerte Données"
      }
    ]
  },
  {
    id: "morale",
    type: "Personnes Morales",
    icon: "Building2",
    description: "Documents requis pour les sociétés commerciales et entités juridiques.",
    documents: [
      {
        id: "id-pm",
        name: "Dossier d'identification de l'entité",
        description: "Extrait RNE, Statuts, Liste des actionnaires, Mandats et pouvoirs.",
        requirements: [
          "Extrait RNE récent.",
          "Statuts pour les SARL et SUARL.",
          "Liste des actionnaires pour les SA.",
          "Mandats et pouvoirs des signataires.",
          "Documents permettant d'identifier le(s) bénéficiaire(s) effectif(s).",
          "Toutes les copies doivent être certifiées (Nom, prénom, signature et mention « conforme à l'original »)."
        ],
        alertType: "Alerte Fraude Documentaire"
      },
      {
        id: "kyc-pm",
        name: "Fiche KYC Personne Morale",
        requirements: [
          "Doit comporter la signature du représentant légal.",
          "Doit comporter le cachet de la société."
        ],
        alertType: "Alerte Non-Conformité"
      },
      {
        id: "kyc-update-pm",
        name: "Fiche KYC actualisée (PM)",
        requirements: [
          "Requise en cas de modification des statuts ou de la structure.",
          "Signature et cachet obligatoires."
        ],
        alertType: "Alerte Données"
      }
    ]
  },
  {
    id: "obnl",
    type: "OBNL / Associations",
    icon: "Users2",
    description: "Documents requis pour les associations et organisations à but non lucratif.",
    documents: [
      {
        id: "id-obnl",
        name: "Dossier de constitution de l'association",
        description: "JORT, Autorisation, Statuts.",
        requirements: [
          "Extrait du Journal Officiel (JORT) relatif à la création.",
          "Autorisation pour la constitution.",
          "Liste des membres du bureau exécutif et leurs numéros de CIN.",
          "Statuts de l'association.",
          "Documents certifiés (Nom, prénom, signature et mention « conforme à l'original »)."
        ],
        alertType: "Alerte Fraude Documentaire"
      },
      {
        id: "auth-fin-obnl",
        name: "Identification des habilités financières",
        requirements: [
          "COPIE DE LA CIN (ou passeport/séjour) des personnes habilitées aux opérations financières.",
          "Copies certifiées conformes à l'original obligatoires."
        ],
        alertType: "Alerte Signature"
      },
      {
        id: "kyc-obnl",
        name: "Fiche KYC OBNL",
        requirements: [
          "Doit comporter la signature du responsable.",
          "Doit comporter le cachet de l'organisation."
        ],
        alertType: "Alerte Non-Conformité"
      },
      {
        id: "kyc-update-obnl",
        name: "Fiche KYC actualisée (OBNL)",
        requirements: [
          "Requise en cas de changement dans le bureau ou les statuts.",
          "Signature et cachet obligatoires."
        ],
        alertType: "Alerte Données"
      }
    ]
  }
];
