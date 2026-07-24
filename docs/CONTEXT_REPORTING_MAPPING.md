# CONTEXTE ARCHITECTURAL & CARTOGRAPHIE MODULAIRE POUR LE REPORTING AUTOMATISÉ (GRC - MAE COMPLIANCE)

> **Document de Référence Ultime (Context Token Optimizer)**
> Ce document centralise la cartographie complète de l'application **Compliance (MAE Assurance)**, la localisation exacte des fonctionnalités, leurs sources de données, leurs dépendances et les indicateurs (KPIs) associés pour le moteur de Reporting.

---

## 1. CARTOGRAPHIE COMPLÈTE DES MODULES DE L'APPLICATION

| Module Application | Route Next.js | Fichiers Directeurs & Contextes | Metrics & Données Ratios Générées |
| :--- | :--- | :--- | :--- |
| **01. Tableau de Bord Global** | `/dashboard` | `src/app/(app)/dashboard/page.tsx` (1800+ L)<br>`src/contexts/PlanDataContext.tsx` | - Score Global de Conformité (%)<br>- Ratio Tâches en Retard / En Cours<br>- Top Risques Critiques & Facteurs de Risques<br>- Fil d'actualité réglo-métier IA |
| **02. Cartographie & Matrice des Risques (DMR)** | `/risk-mapping` | `src/app/(app)/risk-mapping/page.tsx`<br>`src/app/(app)/risk-mapping/RiskMatrixTab.tsx`<br>`src/contexts/RiskMappingContext.tsx`<br>`src/data/mockRiskMapping.ts` | - Matrice d'exposition (Inhérent vs Résiduel)<br>- Taux d'avancement du Plan d'Actions (%)<br>- Position MAE Assurance (Appétence)<br>- Logs d'Historisation & Facteurs (Pays, Canaux, etc.) |
| **03. Plan d'Organisation & Gouvernance** | `/plan` | `src/app/(app)/plan/page.tsx`<br>`src/contexts/PlanDataContext.tsx`<br>`src/data/compliancePlan.ts` | - Complétude du Plan d'Organisation (%)<br>- Progrès par Pilier (Gouvernance, Procédures, Audit)<br>- Statut des Recommandations |
| **04. Cartographie des Acteurs & Agences (LAB-FT)** | `/ecosystem` | `src/app/(app)/ecosystem/page.tsx`<br>`src/data/agencyGeography.ts` | - Répartition par Niveau de Risque Agences (Élevé, Moyen, Faible)<br>- Couverture Géographique des Gouvernorats<br>- Vulnérabilité des Canaux / Tiers |
| **05. Rapprochement RegTools vs NS** | `/regtools-diff` | `src/app/(app)/regtools-diff/page.tsx`<br>`regles_rapprochement.md` | - Taux de Correspondance Identifiants / Noms<br>- Matching Jaro-Winkler & Normalisation<br>- Volume des dossiers à contrôler |
| **06. Contrôle & Suivi (Audit Interne & Échantillonnage)** | `/controle-suivi` | `src/app/(app)/controle-suivi/page.tsx` | - Échantillons sous Contrôle Manuel (PP, OBNL, PM)<br>- Taux de Conformité Données vs Documents<br>- Échéancier et Suivi des Remédiations |
| **07. Gestion Documentaire (GED)** | `/documents` | `src/app/(app)/documents/page.tsx`<br>`src/contexts/DocumentsContext.tsx`<br>`src/data/mockDocuments.ts` | - Couverture Documentaire par Catégorie<br>- Taux de Révision / Péremption des Procédures<br>- Complétude de la Base Légale |
| **08. Formations & Compétences (Skill Matrix)** | `/training` & `/training-v2` | `src/app/(app)/training/page.tsx`<br>`src/data/mockTrainingData.ts` | - Taux de Complétude des Formations LAB-FT (%)<br>- Scores Moyens aux Quiz Métiers<br>- Matrice des Compétences des Collaborateurs |
| **09. Assistance IA & Veille Réglementaire** | `/quick-response` & `/regulatory-watch` | `src/app/(app)/quick-response/page.tsx`<br>`src/contexts/IdentifiedRegulationsContext.tsx` | - Volume d'Analyses IA & Requêtes Traitées<br>- Alertes de Changement Réglementaire Impactants |
| **10. Administration & Journal d'Activité** | `/history` & `/admin` | `src/app/(app)/history/page.tsx`<br>`historique_projet.md` | - Piste d'Audit Complète (Logs Firestore)<br>- Répartition des Actions (Ajouts, Edits, Suppressions, Alertes) |

---

## 2. SOURCES DE DONNÉES ET CONTEXTES REACT CENTRALISÉS

Pour éviter toute recherche inutile lors des itérations futures, voici la liste exacte des Contextes et Data Mocks de l'application :

1. **`useRiskMapping()`** (`src/contexts/RiskMappingContext.tsx`)
   - `risks`: Liste des risques avec Facteurs, Sous-facteurs, Impact/Probabilité inhérent & résiduel, Plan d'actions (0/33/66/100%).
   - `addRisk`, `editRisk`, `deleteRisk`, `updateActionItemProgress`.

2. **`usePlanData()`** (`src/contexts/PlanDataContext.tsx`)
   - `planData`: Sections, sous-sections et éléments de contrôle de l'organisation.
   - `activeWorkflows`: Workflows en cours avec étapes de validation.

3. **`useDocuments()`** (`src/contexts/DocumentsContext.tsx`)
   - `documents`: Liste des procédures, politiques et textes de référence.

4. **`useTimeline()`** (`src/contexts/TimelineContext.tsx`)
   - `events`: Événements de contrôle, échéances de remédiation, preuves de conformité.

5. **`getAgencyGeography()`** (`src/data/agencyGeography.ts`)
   - Données géographiques des agences, gouvernorats et scores de vulnérabilité LAB-FT.

6. **`mockTrainingData`** (`src/data/mockTrainingData.ts`)
   - Modules de formation, inscriptions, taux de réussite et scores de compétences.

---

## 3. ARCHITECTURE DU REPORTING MÉTAMORPHOSÉ

Le nouveau moteur de Reporting de l'application s'articule autour de **5 Modèles Majeurs d'Intelligence Reports** :

### 📊 1. Monthly Pulse (Rapport Exécutif de Conformité Global)
- **Cible** : Direction Générale & Comité d'Audit.
- **Données consolidées** : Dashboard + Plan d'Organisation + Risk Mapping.
- **Indicateurs clés** : Index Global GRC, Top 5 Risques Résiduels, Progrès des Plans d'Action.

### 🛡️ 2. LAB-FT Vector (Rapport de Vigilance Anti-Blanchiment & FT)
- **Cible** : Compliance Officer / Responsable LAB-FT / Organes de Contrôle (BCT, CTAF).
- **Données consolidées** : Ecosystem / Agences + Risques Financiers + Formations LAB-FT.
- **Indicateurs clés** : Cartographie des agences à haut risque, Taux d'entraînement du personnel LAB-FT, Alertes sur circuits financiers.

### 👥 3. Skill Matrix & Capacity Report (Bilan Compétences & Formations)
- **Cible** : Direction RH & Responsable Formation Compliance.
- **Données consolidées** : Training + Training-v2 + Habilitations.
- **Indicateurs clés** : Taux de certification par département, score moyen quiz réglementaires, écarts de compétences.

### 🔍 4. Audit & Control Trail (Rapport Rapprochement RegTools & Contrôle)
- **Cible** : Auditeurs Internes / Externes & Inspection.
- **Données consolidées** : RegTools-Diff + Contrôle-Suivi + Journal d'Activité.
- **Indicateurs clés** : Taux de conformité des dossiers clients échantillonnés, écarts RegTools vs NS (Jaro-Winkler), Traçabilité des remédiations.

### ⚠️ 5. Crisis & Incident Analytica (Gestion des Ruptures & Vulnérabilités)
- **Cible** : Risk Manager & Comité de Crise.
- **Données consolidées** : Alertes Risques + Différences Réglementaires + Incidents.
- **Indicateurs clés** : Incidents détectés, plan d'urgence, temps moyen de résolution (MTTR).

### 🏛️ 6. CGA Regulatory Vector (Générateur Dynamique & Export Word CGA Officiel)
- **Cible** : Comité Général des Assurances (CGA), Direction Générale, Comité d'Audit & Risques MAE.
- **Titre Officiel** : *تقرير سنوي موجه للهيئة العامة للتأمين حول منظومة مكافحة الإرهاب ومنع غسل الأموال*
- **Fonctionnement du Générateur Dynamique & Export Word** :
  - **Mention Réglementaire 2026** : Affichage automatique de la mention *"Données arrêtées à la date du jour (ex: 24/07/2026)"* pour l'exercice en cours 2026.
  - **Logo Officiel MAE Assurance** : Incrustation du logo officiel MAE dans le composant d'affichage à l'écran et dans le document Microsoft Word généré.
  - **Export Word Exclusif Trame CGA (.doc)** : Le bouton d'export Word génère exclusivement la trame officielle bilingue CGA (Arabe/Français) normée avec l'en-tête MAE et les Tableaux 01, 02 (GO-AML) et 03 (Gel des avoirs).
  - **Liaison Matrice des Risques & Notifications CTAF/GAFI** : Synchronisation directe entre les facteurs de risque pays modifiés dans la *Cartographie des Risques* (`/risk-mapping`) et la rubrique CTAF du rapport.

---

## 4. LES 6 VECTEURS DE REPORTING INTERACTIFS (NOMS EN FRANÇAIS)

1. 🏛️ **Générateur Officiel CGA** (`cga_annual`) : Rapport annuel normé pour la CGA (Arabe/Français) avec Export Word.
2. 📊 **Baromètre Mensuel GRC** (`compliance_summary`) : Vue synthétique globale de la conformité et gouvernance.
3. 🛡️ **Vigilance LAB-FT** (`lab_ft_activity`) : Cartographie de vulnérabilité du réseau d'agences et filtrage PEP.
4. 👥 **Matrice des Compétences** (`training_status`) : Bilan des formations réglementaires et résultats QCM.
5. 🔍 **Piste d'Audit & Contrôle** (`audit_trail`) : Rapprochements RegTools vs NS et contrôles échantillonnés.
6. ⚠️ **Analyse d'Incidents & Crises** (`incident_report`) : Suivi des ruptures de conformité et remédiations.

---

## 5. FONCTIONNALITÉS CLÉS D'EXPORTATION

- **Générateur Word Officiel CGA (.doc)** : Document Microsoft Word natif enrichi du logo MAE et de la mention de date du jour.
- **Visualisation Interactive Réactive** : Adaptation instantanée des graphiques et des tableaux au changement d'exercice (2026 par défaut).
- **Exportateur Excel (.xlsx)** : Fichiers multi-onglets structurés par thématique.

---
*Ce document sert de mémoire vive pour toutes les sessions de développement ultérieures sur le module Reporting.*
