/**
 * @fileOverview Base de connaissance réglementaire verbatim pour l'Assistant IA.
 * Contient les extraits du Règlement CGA n°2/2019, des Lignes Directrices d'Août 2025
 * et des Recommandations du GAFI.
 */

export const LEGAL_KNOWLEDGE_BASE = `
RÈGLEMENT CGA N°2/2019 (TUNISIE) - Extraits Verbatim :
- Art. 3 : Les sociétés d'assurances... doivent s'assurer, au moyen de documents officiels... de l'identité complète du souscripteur, de l'assuré et du bénéficiaire... leurs activités et leurs adresses.
- Art. 5 : Créer un dossier pour chaque client afin de conserver une copie de ses documents officiels... certifiés conformes aux originaux par l'agent.
- Art. 7 (Seuils Espèces) : Vigilance renforcée si primes en espèces ≥ 5.000 DT, même par versements liés.
- Art. 8 (PPE) : Autorisation de la direction générale obligatoire avant de nouer une relation avec une Personne Politiquement Exposée. surveillance renforcée et continue.
- Art. 10 (Vie) : Le bénéficiaire du contrat d'assurance vie est un facteur de risque élevé.
- Art. 12 : Attention particulière aux opérations inhabituelles. Examen consigné par écrit.
- Art. 13 (DS) : Si soupçon, suspendre l'opération temporairement et déclarer à la CTAF sans délai. Confidentialité absolue (Tip-off).

LIGNES DIRECTRICES AOÛT 2025 (Tunisie) - Extraits Verbatim :
- Identification BE : Démarche progressive (1. PP ≥ 20% capital/vote, 2. Contrôle effectif, 3. Dirigeant principal).
- Calcul Holding : Multiplication des % à chaque niveau pour calculer la détention indirecte (ex: 60% x 80% = 48%).
- Mise à jour KYC : Périodicité selon risque : Élevé (1 an), Moyen (2 ans), Faible (5 ans).
- Indice de soupçon : Pas besoin de preuve formelle ; la simple présence d’indices concordants suffit à fonder une déclaration de soupçon.

RECOMMANDATIONS DU GAFI (FATF) - Extraits Verbatim :
- Rec. 21 (Confidentialité) : (a) Protection légale des employés déclarant de bonne foi leurs soupçons à la CRF. (b) Interdiction de divulguer le fait qu'une DOS a été communiquée (anti-divulgation).
- Rec. 22 (EPNFD) : Les obligations de vigilance s'appliquent aux Casinos (seuil), Agents immobiliers, Négociants métaux/pierres précieuses (seuil espèces), Avocats/Notaires (achat/vente immo, gestion actifs, création sociétés).
- Rec. 24 (Bénéficiaires Effectifs) : Les pays doivent s'assurer que des informations exactes et à jour sur les bénéficiaires effectifs des personnes morales sont accessibles via un registre.
- Rec. 29 (CRF) : Institution d'une cellule de renseignements financiers (CRF) comme centre national pour la réception et l'analyse des DOS.
- Rec. 32 (Passeurs de fonds) : Mesures pour détecter les transports physiques transfrontaliers d'espèces ; pouvoir de bloquer ou retenir les fonds suspectés.

MANUEL DE PROCÉDURES INTERNES - MAE ASSURANCES :
- Conservation : Conserver le dossier client et les documents de transaction pendant 10 ans après la fin de la relation d'affaires.
- Sanctions : Vérification systématique CNLCT/NU. Si correspondance confirmée : Suspension immédiate (5 jours) + DS à la CTAF et à la CNLCT.
- CNLCT : En cas de refus de renouvellement ou absence de réponse sous 7 jours de la CNLCT, le contrat échu ne sera pas renouvelé.
- PPE : L'intervenant doit (1) Vérifier SI, (2) Vérifier profession, (3) Demander au client directement (proches inclus). Autorisation DG obligatoire.
- KYC / Risque : Utilisation obligatoire du SI "RegTools". Évaluation Risque BA/FT/PA selon matrice interne.
- Vigilance renforcée (Risque élevé) : Entretien présentiel obligatoire, origine des fonds, adéquation primes/revenus, transmission directe au responsable conformité.
- Déclaration de soupçon : Email interne immédiat au responsable conformité (Identité, Nature relation, Éléments déclencheurs).
- Tip-off interne : Le responsable conformité informe les structures concernées qui doivent suspendre les opérations pendant 5 jours ouvrés.
- Formation : Au moins une action de formation annuelle obligatoire pour tous les collaborateurs sur la LBA/FT/PA.
`;
