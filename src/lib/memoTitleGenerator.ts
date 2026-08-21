import { MemoPillar } from "@/types/memo";

/**
 * Extraction sémantique locale d'un titre de mémo direct, fidèle et sans déformation.
 * Fonctionne à 0ms de latence et sans dépendance réseau.
 */
export function extractFaithfulTitle(content: string, pillar?: MemoPillar, sectionLabel?: string): string {
  if (!content || !content.trim()) {
    return sectionLabel ? `Note — ${sectionLabel}` : "Note de conformité";
  }

  const raw = content.trim();

  // 1. Prendre la première ligne ou première phrase significative
  const firstLine = raw.split("\n").find((l) => l.trim().length > 0) || raw;
  let clean = firstLine.trim();

  // 2. Retirer les puces, tirets et numérotations de début de ligne
  clean = clean.replace(/^[•\-\*#\d\.\)\s]+/, "").trim();

  // 3. Supprimer les préfixes conversationnels et amorces courantes
  const conversationalPrefixes = [
    /^bonjour\s*,?\s*(l'équipe|à tous|équipe)?\s*[:,.]?\s*/i,
    /^(bonsoir|salut|hello)\s*,?\s*/i,
    /^(prière de|merci de|veuillez|il faut|il conviendrait de|il est nécessaire de|nous devons|on doit|je vous prie de)\s+/i,
    /^(j'ai constaté que|j'ai remarqué que|il a été constaté que|il apparaît que|nous constatons que)\s+/i,
    /^(objet\s*:\s*|sujet\s*:\s*|note\s*:\s*|titre\s*:\s*|mémo\s*:\s*)/i,
    /^(attention\s*:\s*|urgent\s*:\s*|important\s*:\s*)/i,
  ];

  for (const prefix of conversationalPrefixes) {
    clean = clean.replace(prefix, "").trim();
  }

  // 4. Normaliser les verbes d'action au début si applicable pour un titre percutant
  const actionVerbsMap: [RegExp, string][] = [
    [/^vérifier\s+/i, "Vérification de "],
    [/^contrôler\s+/i, "Contrôle de "],
    [/^valider\s+/i, "Validation de "],
    [/^analyser\s+/i, "Analyse de "],
    [/^mettre à jour\s+/i, "Mise à jour "],
    [/^actualiser\s+/i, "Actualisation de "],
    [/^bloquer\s+/i, "Blocage de "],
    [/^traiter\s+/i, "Traitement de "],
    [/^relancer\s+/i, "Relance "],
    [/^clôturer\s+/i, "Clôture de "],
    [/^revoir\s+/i, "Revue de "],
    [/^corriger\s+/i, "Correction de "],
    [/^demander\s+/i, "Demande de "],
  ];

  for (const [regex, replacement] of actionVerbsMap) {
    if (regex.test(clean)) {
      clean = clean.replace(regex, replacement).trim();
      break;
    }
  }

  // 5. Couper à la première ponctuation forte si la phrase est trop longue
  const sentenceEnd = clean.search(/[.?!;]/);
  if (sentenceEnd > 15) {
    clean = clean.substring(0, sentenceEnd).trim();
  }

  // 6. Limiter la longueur maximale à ~70 caractères ou 8-10 mots max pour un titre élégant
  const words = clean.split(/\s+/);
  if (words.length > 9) {
    clean = words.slice(0, 8).join(" ");
  }

  if (clean.length > 65) {
    clean = clean.substring(0, 62).trim() + "...";
  }

  // 7. Nettoyer la ponctuation finale résiduelle
  clean = clean.replace(/[,;:\-\s]+$/, "").trim();

  // 8. Mettre en majuscule la première lettre
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // Si après nettoyage la chaîne est trop courte (< 4 caractères), générer un titre contextuel
  if (clean.length < 4) {
    const pillarName =
      pillar === "LAB_FT"
        ? "Note LAB/FT"
        : pillar === "CONFORMITE_REGLEMENTAIRE"
        ? "Point Réglementaire"
        : "Consigne Conformité";
    return sectionLabel ? `${pillarName} — ${sectionLabel}` : pillarName;
  }

  return clean;
}
