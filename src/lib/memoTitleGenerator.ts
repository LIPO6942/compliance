import { MemoPillar } from "@/types/memo";

/**
 * Moteur d'analyse sémantique et de synthèse de titre en français.
 * Analyse les propositions, sujets clés et prédicats pour produire un vrai titre résumé
 * sans jamais se limiter à une troncature bête des premiers mots.
 */
export function extractFaithfulTitle(content: string, pillar?: MemoPillar, sectionLabel?: string): string {
  if (!content || !content.trim()) {
    return sectionLabel ? `Note — ${sectionLabel}` : "Note de conformité";
  }

  const raw = content.trim();

  // 1. Extraire la première phrase ou paragraphe pertinent
  const firstSentence = raw.split(/\n+/)[0] || raw;
  let clean = firstSentence.trim().replace(/^[•\-\*#\d\.\)\s]+/, "");

  // 2. Nettoyer les amorces conversationnelles
  const conversationalPrefixes = [
    /^bonjour\s*,?\s*(l'équipe|à tous|équipe)?\s*[:,.]?\s*/i,
    /^(bonsoir|salut|hello)\s*,?\s*/i,
    /^(prière de|merci de|veuillez|il faut|il conviendrait de|il est nécessaire de|nous devons|on doit|je vous prie de)\s+/i,
    /^(j'ai constaté que|j'ai remarqué que|il a été constaté que|il apparaît que|nous constatons que|à noter que)\s+/i,
    /^(objet\s*:\s*|sujet\s*:\s*|note\s*:\s*|titre\s*:\s*|mémo\s*:\s*)/i,
    /^(attention\s*:\s*|urgent\s*:\s*|important\s*:\s*)/i,
  ];

  for (const prefix of conversationalPrefixes) {
    clean = clean.replace(prefix, "").trim();
  }

  // 3. Détecter les entités entre guillemets ou crochets (ex: 'Agent éditeur', "Scoring")
  const quotedMatch = clean.match(/['"«]([^'"»]{2,35})['"»]/);
  const quotedEntity = quotedMatch ? quotedMatch[1] : null;

  // 4. Détection intelligente de Problèmes / Anomalies (ex: devient vide, non persistée, erreur, disparaît)
  const isMissingOrEmpty = /(devient\s+vide|non\s+persist[eé]e?|dispara[iî]t|perte\s+de|introuvable|manquante?|non\s+affich[eé]e?)/i.test(clean);
  const isErrorOrBug = /(erreur|anomalie|dysfonctionnement|bug|bloqu[eé]|rejet[eé]|incoh[eé]ren)/i.test(clean);
  const isDuplicate = /(doublon|dupliqu[eé]|appara[iî]t\s+plusieurs\s+fois)/i.test(clean);
  const isPaginationContext = /(pagination|navigation|changement\s+de\s+page|deuxi[eè]me\s+page|page\s+suivante)/i.test(clean);

  // Cas spécifique : Colonne / Champ avec perte de données ou pagination
  if (quotedEntity && isMissingOrEmpty) {
    const contextSuffix = isPaginationContext ? " (Pagination)" : "";
    return `Non-persistance de la colonne '${quotedEntity}'${contextSuffix}`;
  }

  if (quotedEntity && isErrorOrBug) {
    const contextSuffix = isPaginationContext ? " (Pagination)" : "";
    return `Anomalie sur '${quotedEntity}'${contextSuffix}`;
  }

  if (quotedEntity && isDuplicate) {
    return `Gestion des doublons sur '${quotedEntity}'`;
  }

  // 5. Détection de structures d'opposition "X mais Y" (ex: "X est renseigné mais devient vide")
  const oppositionMatch = clean.match(/^(.+?)\s+(?:mais|cependant|or|toutefois)\s+(.+)$/i);
  if (oppositionMatch) {
    const subjectPart = oppositionMatch[1].trim();
    const consequencePart = oppositionMatch[2].trim();

    // Extraire le sujet de la 1ère partie
    let subject = subjectPart
      .replace(/^(la|le|les|l'|un|une|des)\s+/i, "")
      .replace(/\s+(est|sont)\s+.+$/i, "")
      .trim();

    // Extraire l'état de la 2nde partie
    let problem = consequencePart;
    if (/devient\s+vide/i.test(consequencePart)) problem = "devient vide";
    else if (/non\s+persist/i.test(consequencePart)) problem = "non persisté(e)";
    else if (/ne\s+fonctionne\s+pas/i.test(consequencePart)) problem = "inopérant";

    if (subject.length > 2 && subject.length < 35) {
      const pageInfo = isPaginationContext ? " lors de la pagination" : "";
      return `Problème ${subject} : ${problem}${pageInfo}`;
    }
  }

  // 6. Normaliser les verbes d'action au début (Nominalisation)
  const actionVerbsMap: [RegExp, string][] = [
    [/^v[eé]rifier\s+(?:que\s+|si\s+)?/i, "Vérification de "],
    [/^contr[oô]ler\s+/i, "Contrôle de "],
    [/^valider\s+/i, "Validation de "],
    [/^analyser\s+/i, "Analyse de "],
    [/^mettre\s+[aà]\s+jour\s+/i, "Mise à jour de "],
    [/^actualiser\s+/i, "Actualisation de "],
    [/^bloquer\s+/i, "Blocage de "],
    [/^traiter\s+/i, "Traitement de "],
    [/^relancer\s+/i, "Relance de "],
    [/^cl[oô]turer\s+/i, "Clôture de "],
    [/^revoir\s+/i, "Revue de "],
    [/^corriger\s+/i, "Correction de "],
    [/^demander\s+/i, "Demande de "],
    [/^ajouter\s+/i, "Ajout de "],
    [/^supprimer\s+/i, "Suppression de "],
  ];

  for (const [regex, replacement] of actionVerbsMap) {
    if (regex.test(clean)) {
      clean = clean.replace(regex, replacement).trim();
      break;
    }
  }

  // 7. Si le texte commence par "La colonne X" ou "Le champ X"
  const colMatch = clean.match(/^(?:la\s+colonne|le\s+champ|le\s+tableau|le\s+bouton)\s+['"«]?([^'"»]+)['"»]?/i);
  if (colMatch) {
    const elemName = colMatch[1].trim();
    if (isMissingOrEmpty) {
      return `Non-persistance '${elemName}'${isPaginationContext ? " (Pagination)" : ""}`;
    }
    if (isErrorOrBug) {
      return `Dysfonctionnement '${elemName}'`;
    }
  }

  // 8. Nettoyage de fin de phrase : couper à la première ponctuation forte
  const sentenceEnd = clean.search(/[.?!;]/);
  if (sentenceEnd > 10) {
    clean = clean.substring(0, sentenceEnd).trim();
  }

  // 9. Si la phrase est encore trop longue, couper intelligemment sur un mot plein (pas sur des prépositions)
  const words = clean.split(/\s+/);
  if (words.length > 8) {
    // Éviter de couper sur 'sur', 'la', 'de', 'le', 'et', 'dans', 'pour', 'mais'
    const stopWords = new Set(["sur", "la", "le", "les", "de", "du", "des", "et", "dans", "pour", "mais", "un", "une", "au", "aux"]);
    let sliceIdx = 7;
    while (sliceIdx > 3 && stopWords.has(words[sliceIdx]?.toLowerCase())) {
      sliceIdx--;
    }
    clean = words.slice(0, sliceIdx + 1).join(" ");
  }

  clean = clean.replace(/[,;:\-\s]+$/, "").trim();

  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

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
