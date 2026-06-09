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

## 2. Règles de Classification des Entités (Type de Fiche)

Le type d'entité d'un client est déterminé dynamiquement en analysant la structure de son **identifiant** et la valeur de la colonne **CAT_I** (Catégorie d'intervenant) du fichier NS :

| Type d'Entité | Règle d'Identification | Exemple |
| :--- | :--- | :--- |
| **Personne Physique (CIN)** | L'identifiant est **uniquement numérique** (ne contient que des chiffres). | `1416431` |
| **Personne Physique (Passeport)** | L'identifiant **commence par un chiffre** mais contient des lettres **OU** commence par une lettre et se termine par un chiffre. | `N941169`, `J029825`, `12345A` |
| **Association (OBNL)** | L'identifiant contient des **lettres à la fin** **ET** la colonne `CAT_I` contient le chiffre `"6"`. | `ASS100B` (avec CAT_I = `6`) |
| **Personne Morale** | L'identifiant contient des **lettres à la fin** mais la colonne `CAT_I` ne contient pas le chiffre `"6"`. | `STE200B` (avec CAT_I = `1`) |

---

## 3. Implémentation Technique (Algorithme)

Voici l'algorithme JavaScript implémenté dans l'application pour cette classification :

```typescript
/**
 * Détecte le type d'entité d'un client
 * @param idRaw Identifiant brut
 * @param catIRaw Valeur brute de la colonne de catégorie (CAT_I)
 */
const detectClientType = (idRaw: any, catIRaw: any): string => {
  if (idRaw === undefined || idRaw === null) return "Inconnu";
  const id = String(idRaw).trim().toUpperCase();
  if (id === "") return "Inconnu";
  
  const catI = catIRaw !== undefined && catIRaw !== null ? String(catIRaw).trim() : "";
  
  // 1. Uniquement numérique => Personne Physique (CIN)
  if (/^\d+$/.test(id)) {
    return "Personne Physique (CIN)";
  }
  
  // 2. Commence par un chiffre (et contient des lettres car non uniquement numérique) => Personne Physique (Passeport)
  if (/^\d/.test(id)) {
    return "Personne Physique (Passeport)";
  }
  
  // 3. Contient des lettres à la fin => Personne Morale ou Association (OBNL)
  if (/[A-Z]$/.test(id)) {
    if (catI === "6" || catI.includes("6")) {
      return "Association (OBNL)";
    }
    return "Personne Morale";
  }
  
  // 4. Par défaut, si commence par une lettre et se termine par un chiffre (ex: J029825) => Personne Physique (Passeport)
  if (/^[A-Z]/.test(id) && /\d$/.test(id)) {
    return "Personne Physique (Passeport)";
  }
  
  // Autre cas (par défaut)
  if (catI === "6" || catI.includes("6")) {
    return "Association (OBNL)";
  }
  return "Personne Morale";
};
```
