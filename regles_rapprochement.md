# Règles Métier de Rapprochement et de Conformité KYC (RegTools vs Production)

Ce document formalise l'ensemble des règles métier appliquées dans le module de **Rapprochement** de l'application **Compliance**. Il définit les critères de comparaison entre les fichiers de production des contrats (Non-Vie et Vie) et la base de connaissance client **RegTools**, ainsi que les règles de qualification, de scoring du risque LCB-FT et de pilotage du réseau.

---

## 1. Périmètre et Éligibilité des Données

Le rapprochement confronte les flux de souscriptions commerciales aux fiches de connaissance client (KYC) disponibles dans le référentiel de conformité :

* **Portefeuille Non-Vie (IARD) :** 
  * Prend en compte l'ensemble des souscriptions enregistrées sur la période d'arrêté mensuelle.
* **Portefeuille Vie :** 
  * Application d'un filtre strict d'éligibilité pour ne cibler que les contrats générateurs d'une nouvelle obligation d'identification KYC :
    * **Nature de l'avenant :** Seules les souscriptions qualifiées d'**« Affaire nouvelle »** sont retenues (les avenants de modification ou de reconduction sans nouvelle souscription sont exclus).
    * **Statut du contrat :** Seuls les contrats au statut **« En cours »** sont retenus (les affaires annulées, sans effet ou résiliées sont exclues).
  * **Déduplication préalable :** Si un même client souscrit plusieurs contrats Vie au cours du même mois, une seule occurrence est retenue pour l'évaluation de sa conformité KYC.
* **Référentiel RegTools :** 
  * Base de référence centralisant l'ensemble des fiches d'identification client (diligences KYC accomplies, profils de risque, criblage PEP et sanctions).

---

## 2. Règles de Correspondance des Identifiants (Matching Strict)

Pour associer un souscripteur du fichier de production avec sa fiche RegTools, la clé d'identification subit une harmonisation normalisée avant comparaison :

* **Insensibilité à la casse :** Majuscules et minuscules sont traitées à l'identique (ex. : `1946279W` et `1946279w` désignent le même client).
* **Élimination des espaces parasites :** Tous les espaces (en début, fin ou milieu de chaîne) sont retirés.
* **Neutralisation des formatages numériques :** Les suffixes décimaux parasites issus des extractions tableurs (ex. : `.0` en fin de chaîne) sont supprimés.
* **Suppression des zéros non significatifs :** Les zéros placés en tête d'identifiant sont ignorés pour aligner les formats (ex. : `00012345` est aligné avec `12345`).
* **Nettoyage des séparateurs :** Les caractères spéciaux de séparation (tirets, barres obliques, points) sont neutralisés pour comparer les valeurs brutes.

---

## 3. Règles de Correspondance par Nom (Matching par Similitude)

Lorsqu'un client ne présente pas d'identifiant concordant (ou en cas d'erreur de saisie de l'identifiant), un rapprochement patronymique alternatif est appliqué en deux étapes :

### A. Normalisation Phonétique et Orthographique
* **Suppression des accents et caractères spéciaux :** Les lettres accentuées sont converties en caractères standards non accentués.
* **Neutralisation des particules et mentions usuelles :** Les mots de liaison, particules familiales et mentions civiles fréquentes (ex. : `ep`, `epouse`, `ben`, `abd`, `de`, `el`, `al`, `bin`, `la`, `le`, `du`) sont écartés afin d'éviter les biais de comparaison.
* **Indépendance de l'ordre Nom / Prénom :** Les termes composant le nom complet sont triés par ordre alphabétique. Ainsi, une saisie inversée entre le nom et le prénom (ex. : `BEN BARKA MOUNIRA` et `MOUNIRA BEN BARKA`) est reconnue comme une seule et même identité.

### B. Niveaux de Similitude
1. **Similitude Exacte Normalisée :** Si le nom normalisé concorde parfaitement avec une entrée RegTools, le rapprochement est validé avec une certitude absolue.
2. **Similitude Rapprochée (Seuil de Tolérance) :** 
   * En l'absence de correspondance exacte, une mesure de similarité orthographique est appliquée.
   * Un seuil d'exigence fixé à **96% de similarité minimale** est imposé pour valider le rapprochement.
   * Tout score inférieur à 96% est rejeté afin de prévenir tout risque de faux rapprochement (homonymes proches).

---

## 4. Qualification Automatique des Types d'Entités

La nature juridique du client est déterminée selon la structure de son document officiel et sa catégorie déclarée :

* **Personne Physique (CIN) :** Identifiant composé exclusivement d'une suite de chiffres (format standard de la Carte d'Identité Nationale tunisienne à 8 chiffres).
* **Personne Physique (Passeport / Titre de séjour) :** Identifiant alphanumérique comportant un préfixe ou un suffixe alphabétique avec une base numérique (ressortissants étrangers ou pièces consulaires).
* **Personne Morale (Entreprise / Société) :** 
  * Identifiant structuré sous forme de Matricule Fiscal (suite de chiffres terminée par une lettre clé).
  * Ou client associé au code catégorie fiscale des entreprises.
* **Association / Organisation à But Non Lucratif (OBNL) :**
  * Qualification prioritaire via le code catégorie spécifique OBNL.
  * Détection sémantique complémentaire basée sur la présence de termes caractéristiques dans la raison sociale : *association, organisation, fondation, comité, amicale, ligue, fédération, club, union, groupement, coopérative, jemaia, jamia, rabita, nadi, stade, olympique, sportive, cercle, ONG*.

---

## 5. Détection des Multi-Identifiants et Nettoyage du Portefeuille (Portefeuille Sain)

Afin d'évaluer fidèlement le nombre de clients réels au sein de la base RegTools, l'outil analyse les cas où une même personne physique détient plusieurs fiches créées sous des documents distincts :

* **Règle d'Exclusion Stricte des Homonymes :**
  * Si deux fiches partagent le même nom mais présentent **deux numéros de CIN distincts**, elles sont impérativement traitées comme deux personnes différentes. Un citoyen ne pouvant légalement détenir deux numéros de CIN, ces dossiers sont exclus de la détection de doublons.
* **Confirmation de Doublon Documentaire (Confiance Élevée) :**
  * Une situation de multi-identifiant est confirmée avec un degré de certitude élevé lorsque le même individu (même nom normalisé et même type d'entité) possède à la fois :
    * Une fiche sous **Carte d'Identité Nationale (CIN)**, et
    * Une fiche sous **Passeport**.
* **Suspicion Modérée :**
  * Détection de deux passeports distincts pour un même nom (pouvant correspondre à un renouvellement de passeport ou à deux personnes distinctes).
* **Calcul du « Portefeuille Sain » (Clients Uniques Estimés) :**
  * Seuls les doublons documentaires confirmés (cumul CIN + Passeport) sont déduits de la volumétrie brute de RegTools. Cette épuration fournit le nombre réel de clients uniques régularisés.

---

## 6. Typologie des Résultats de Rapprochement

À l'issue de l'analyse, chaque ligne de souscription est classée dans l'une des catégories suivantes :

1. **Rapprochement Strict par Identifiant :** Fiche KYC retrouvée avec certitude sur la base du numéro officiel de pièce ou de matricule fiscal.
2. **Rapprochement par Similitude de Nom :** Fiche KYC retrouvée grâce à la correspondance patronymique (exacte ou floue ≥ 96%).
3. **Écart / KYC Manquant (Client Absent) :** Le souscripteur actif du mois ne dispose d'aucune fiche de connaissance client dans RegTools. Ces dossiers constituent les anomalies prioritaires à régulariser par le réseau commercial.

---

## 7. Suivi Temporel et Régularisation des Écarts (Tracking Multi-Mois)

Le module assure un suivi chronologique mensuel pour mesurer l'efficacité de la collecte des fiches par les agences :

* **Nouveau Manquant :** Client dont l'absence de fiche KYC est constatée pour la première fois sur le mois sous revue.
* **Manquant Persistant :** Client déjà signalé comme manquant lors d'un arrêté antérieur et dont la situation n'a toujours pas été régularisée le mois courant.
* **Dossier Régularisé :** Client identifié comme manquant lors d'un mois précédent, dont la fiche KYC a été complétée et intégrée dans RegTools lors de l'arrêté suivant.
* **Taux de Régularisation :** Proportion des dossiers en anomalie ayant été régularisés d'un mois sur l'autre, calculée globalement et par point de vente.

---

## 8. Grille d'Évaluation du Risque LCB-FT des Dossiers Manquants

Les clients sans fiche KYC ne présentent pas tous le même niveau d'exposition au risque de non-conformité. Une matrice de criticité hiérarchise les relances selon la vulnérabilité intrinsèque du tiers et l'ancienneté de l'anomalie :

| Niveau de Risque | Critères d'Attribution | Justification Réglementaire & Action Requise |
| :--- | :--- | :--- |
| <span style="color:#b91c1c; font-weight:bold;">CRITIQUE</span> | **Association / OBNL absente depuis 3 mois ou plus** | Vulnérabilité maximale au blanchiment et financement du terrorisme. Mise en demeure urgente du réseau commercial. |
| <span style="color:#c2410c; font-weight:bold;">ÉLEVÉ</span> | **Toute Association / OBNL (dès le 1er mois)**<br>— ou —<br>**Personne Morale absente depuis 3 mois ou plus** | Personnes morales et structures associatives à vigilance renforcée. Relance prioritaire avec délai de régularisation strict. |
| <span style="color:#d97706; font-weight:bold;">MOYEN</span> | **Personne Morale absente depuis moins de 3 mois** | Entreprise commerciale récente. Suivi standard dans le cadre des relances mensuelles d'agence. |
| <span style="color:#64748b; font-weight:bold;">FAIBLE</span> | **Personne Physique** | Souscripteur individuel standard. Traitement ordinaire au fil de l'eau. |

---

## 9. Pilotage et Objectifs Réglementaires par Agence

* **Attribution Commerciale :** Chaque contrat est relié à sa structure de souscription (Succursale, Agence directe, Courtier ou Agent général) par son code ou son libellé commercial.
* **Taux de Conformité d'Agence :** 
  $$\text{Taux de Conformité} = \left( \frac{\text{Nombre de Clients avec Fiche KYC Rapprochée}}{\text{Nombre Total de Clients Souscripteurs du Portefeuille}} \right) \times 100$$
* **Objectif Cible Réglementaire :** Le seuil d'exigence minimal fixé pour chaque entité du réseau commercial est de **98% de conformité**.
* **Exports Ciblés des Anomalies :** Possibilité de générer des états d'écarts individualisés par agence pour transmission directe des listes de clients à régulariser aux chefs d'agences et gestionnaires.

---

## 10. Processus d'Échantillonnage et Contrôle Métier sur Pièces

La phase de vérification qualitative approfondie s'effectue par sondage ciblé :

1. **Sélection de l'Échantillon :** Depuis le tableau de bord d'une agence, le responsable conformité sélectionne un lot représentatif de dossiers rapprochés ou en anomalie.
2. **Qualification du Contrôle :** Définition de l'objet de l'audit pour chaque dossier :
   * **Contrôle des Données :** Exactitude et cohérence des renseignements déclaratifs (adresses, activités, statut PEP).
   * **Contrôle des Documents :** Validité, lisibilité et complétude des justificatifs probants (pièce d'identité, justificatif de domicile, statuts, extrait de registre).
3. **Intégration au Module Contrôle et Suivi :** Les dossiers sélectionnés sont automatiquement injectés dans le tableau de bord de **Contrôle et Suivi**, pré-renseignés avec les données de l'agence et du client pour l'exécution des listes de contrôle (checklists) d'audit permanent.
