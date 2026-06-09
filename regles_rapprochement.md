# Règles de Rapprochement et de Classification des Clients (RegTools vs NS)

Ce document formalise les règles appliquées dans l'application **Compliance** pour le rapprochement des bases de données de tiers (RegTools vs NS) et la qualification automatique de leur type d'entité.

---

## 1. Règle de Correspondance des Identifiants (Matching)

Pour associer un client présent dans le fichier NS avec la base de données de référence RegTools, la clé d'identification subit un traitement de normalisation strict et est comparée de manière **insensible à la casse** :

* **Insensibilité à la casse :** Les identifiants `1946279W` et `1946279w` sont convertis en majuscules avant comparaison et sont donc considérés comme **le même client**.
* **Suppression des espaces :** Tous les espaces en début ou fin d'identifiant sont éliminés.
* **Suppression des décimales parasites d'Excel :** Si l'identifiant se termine par `.0` (dû au formatage flottant d'Excel), le suffixe `.0` est supprimé.
* **Suppression des zéros initiaux :** Les zéros au début de l'identifiant sont ignorés pour aligner les formats (ex: `00012345` devient `12345`).

---

## 2. Processus de Classification et de Contrôle Manuel (Échantillonnage)

La qualification du type d'entité n'est plus automatisée à la volée. L'utilisateur qualifie manuellement un échantillon de dossiers depuis l'historique des rapprochements pour les insérer dans le processus de contrôle :

1. **Sélection de l'échantillon :**
   - Depuis l'onglet **Statistiques par Agence** d'un rapprochement sauvegardé, l'utilisateur clique sur l'icône de contrôle d'une agence.
   - Il sélectionne ensuite un échantillon de clients parmi le tableau des similitudes de cette agence.
2. **Qualification Manuelle :**
   - L'utilisateur définit via un popup le type d'entité du lot ou de la ligne parmi :
     - **Personne Physique**
     - **Association (OBNL)**
     - **Personne Morale**
   - Il définit également l'objet du contrôle : **Données** et/ou **Documents** (pour la complétude et exactitude).
3. **Création du Contrôle :**
   - Ces dossiers sont insérés dans le tableau de bord de **Contrôle et Suivi** (collection `/controleSuivi` et stockage local), pré-remplis avec les données de l'agence (code, nom) et du client (identifiant, nom).
   - Les listes de contrôle (checklists) dynamiques s'adapteront à ces choix lors de la construction ultérieure.

