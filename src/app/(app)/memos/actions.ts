"use server";

import { MemoPillar } from "@/types/memo";
import { extractFaithfulTitle } from "@/lib/memoTitleGenerator";

export interface ReformulateMemoParams {
  text: string;
  title?: string;
  pillar: MemoPillar;
  style: "FORMAL" | "SYNTHETIC" | "LEGAL";
  sectionLabel?: string;
}

export interface ReformulateMemoResult {
  reformulatedText?: string;
  suggestedTitle?: string;
  error?: string;
}

export async function reformulateMemoAction(
  params: ReformulateMemoParams
): Promise<ReformulateMemoResult> {
  const { text, title, pillar, style, sectionLabel } = params;

  if (!text || text.trim().length === 0) {
    return { error: "Veuillez saisir un texte à reformuler." };
  }

  const pillarName =
    pillar === "LAB_FT"
      ? "Lutte Anti-Blanchiment et Financement du Terrorisme (LAB/FT)"
      : pillar === "CONFORMITE_REGLEMENTAIRE"
      ? "Conformité Réglementaire & Normative"
      : "Gouvernance & Conformité Générale";

  const styleInstruction =
    style === "FORMAL"
      ? `FORMEL — Transforme ce texte brut en note de service professionnelle avec des phrases complètes et bien construites. Si le texte liste des actions ou constats, reformule-les en paragraphes clairs. Améliore le vocabulaire, corrige la grammaire, restructure si nécessaire. Le résultat doit être immédiatement présentable à la direction.`
      : style === "SYNTHETIC"
      ? `SYNTHÉTIQUE — Reformate en liste de points d'action concis et percutants, préfixés par "•". Chaque point = un verbe d'action fort à l'infinitif + l'objet de l'action. Supprime tout mot superflu. Sois ultra-concis. Format attendu : "📌 Points d'attention :\n• Action 1\n• Action 2"`
      : `RÉGLEMENTAIRE — Reformule chaque action/constat en obligation formelle avec des locutions du type "Il convient de", "Il est requis de", "Il y a lieu de". Utilise le vocabulaire réglementaire tunisien (CGA, CTAF, LCB-FT). Structure en obligations numérotées si plusieurs actions.`;

  const prompt = `Tu es un expert senior en Gouvernance, Risque et Conformité (GRC) pour la MAE Assurance (Tunisie).
Ta mission est de TRANSFORMER le texte brut ci-dessous selon le style demandé. L'objectif est une amélioration visible et significative : le résultat doit sonner professionnel, structuré et immédiatement exploitable.

VOLET MÉTIER : ${pillarName}
SECTION : ${sectionLabel || "Général"}

TEXTE BRUT À AMÉLIORER :
"""
${text}
"""
${title ? `TITRE ACTUEL : "${title}"` : ""}

TRANSFORMATION DEMANDÉE : ${styleInstruction}

RÈGLES ABSOLUES :
1. Le résultat doit être NETTEMENT meilleur que le texte original — pas une simple paraphrase.
2. Corrige toutes les fautes de grammaire, orthographe et accord.
3. Ne garde pas les formulations maladroites ou incomplètes — réécris-les.
4. N'invente PAS de nouveaux sujets, chiffres, noms ou références légales absents du texte.
5. Réponds UNIQUEMENT sous cette forme JSON valide (rien d'autre) :
{
  "suggestedTitle": "Titre court et professionnel (max 8 mots)",
  "reformulatedText": "Texte transformé complet"
}`;

  // 1. Essai avec Groq API si configuré
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    try {
      const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile" || "llama3-8b-8192";
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "Tu es un expert senior en Gouvernance, Risque et Conformité (GRC) MAE Assurance. Tu dois VRAIMENT améliorer le texte fourni — vocabulaire professionnel, structure claire, phrases complètes et enrichies. Tu réponds EXCLUSIVEMENT en JSON valide.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const contentStr = data?.choices?.[0]?.message?.content;
        if (contentStr) {
          const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.reformulatedText) {
              return {
                reformulatedText: parsed.reformulatedText,
                suggestedTitle: parsed.suggestedTitle,
              };
            }
          }
        }
      }
    } catch (groqErr) {
      console.warn("[MEMO AI] Groq attempt error:", groqErr);
    }
  }

  // 2. Fallback Intelligent NLP si pas d'API ou erreur réseau
  const fallback = generateRuleBasedReformulation(text, title, pillar, style);
  return {
    reformulatedText: fallback.text,
    suggestedTitle: fallback.title,
  };
}

// ─── Dictionnaire d'enrichissement lexical métier ───────────────────────────
const LEXICAL_UPGRADES: [RegExp, string][] = [
  [/\bfiltrage\b/gi, "filtrage et identification"],
  [/\bpar agence\b/gi, "par agence commerciale"],
  [/\bsucc digitale?\b/gi, "succursale digitale"],
  [/\bsucc\b/gi, "succursale"],
  [/\bpb\b/gi, "problème"],
  [/\bpbs\b/gi, "problèmes"],
  [/\bpas ok\b/gi, "non conforme"],
  [/\bko\b/gi, "non conforme"],
  [/\bok\b/gi, "conforme"],
  [/\bvérif\b/gi, "vérification"],
  [/\bvérifs\b/gi, "vérifications"],
  [/\bregtools\b/gi, "RegTools"],
  [/\bmae\b/gi, "MAE Assurance"],
  [/\bKYC\b/g, "Know Your Customer (KYC)"],
  [/\bPEP\b/g, "Personne Politiquement Exposée (PEP)"],
  [/\bAML\b/g, "Anti-Money Laundering (AML)"],
  [/\bLAB\/FT\b/gi, "Lutte Contre le Blanchiment et le Financement du Terrorisme (LCB-FT)"],
  [/\bnb\b/gi, "à noter"],
  [/\bsvp\b/gi, "s'il vous plaît"],
  [/\binfo\b/gi, "information"],
  [/\binfos\b/gi, "informations"],
  [/\bpas fonctionnel\b/gi, "non fonctionnel — action corrective requise"],
  [/\bà corriger\b/gi, "à corriger en priorité"],
  [/\bà vérifier\b/gi, "à vérifier impérativement"],
  [/\bà faire\b/gi, "à traiter sans délai"],
  [/\bsuivi\b/gi, "suivi opérationnel"],
  [/\bcontrôle\b/gi, "contrôle de conformité"],
];

function applyLexicalUpgrades(text: string): string {
  let result = text;
  for (const [pattern, replacement] of LEXICAL_UPGRADES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function capitalizeSentences(t: string): string {
  return t.replace(/(^|[.!?]\s+)([a-zàâçéèêëîïôûùüÿœæ])/g, (m, p, c) => p + c.toUpperCase());
}

function stripBullets(line: string): string {
  return line.replace(/^[📌🎯⚠️•\-\*\d+\.\)]+\s*/, "").trim();
}

function endSentence(s: string): string {
  return s.match(/[.!?:]$/) ? s : `${s}.`;
}

function generateRuleBasedReformulation(
  rawText: string,
  rawTitle?: string,
  pillar?: MemoPillar,
  style?: "FORMAL" | "SYNTHETIC" | "LEGAL"
): { text: string; title: string } {
  const clean = rawText.trim();
  const inputTitle = rawTitle?.trim() || "Point de vigilance Conformité";

  const rawLines = clean.split("\n").filter((l) => l.trim().length > 0);
  const strippedLines = rawLines.map(stripBullets).filter(Boolean);

  const enrichedTitle = capitalizeSentences(applyLexicalUpgrades(inputTitle));

  const pillarCtx =
    pillar === "LAB_FT"
      ? "dans le cadre du dispositif LCB-FT"
      : pillar === "CONFORMITE_REGLEMENTAIRE"
      ? "au titre des exigences de conformité réglementaire"
      : "dans le cadre de la gouvernance interne";

  // ── MODE SYNTHÉTIQUE ──────────────────────────────────────────────────────
  if (style === "SYNTHETIC") {
    const actionVerbs = ["Vérifier", "Contrôler", "S'assurer de", "Identifier", "Documenter", "Mettre en œuvre", "Tracer"];
    const bullets = strippedLines.map((l, i) => {
      const enriched = capitalizeSentences(applyLexicalUpgrades(l));
      const wordCount = enriched.split(/\s+/).length;
      if (wordCount < 5) {
        const verb = actionVerbs[i % actionVerbs.length];
        return `• ${verb} : ${enriched.charAt(0).toLowerCase() + enriched.slice(1)}.`;
      }
      return `• ${endSentence(enriched)}`;
    });
    const pillarTag =
      pillar === "LAB_FT" ? "[LCB-FT]" :
      pillar === "CONFORMITE_REGLEMENTAIRE" ? "[Conformité Réglementaire]" : "[Gouvernance]";
    return {
      title: `${pillarTag} ${enrichedTitle}`,
      text: `📌 Points de vigilance — Actions requises :\n\n${bullets.join("\n")}`,
    };
  }

  // ── MODE RÉGLEMENTAIRE ────────────────────────────────────────────────────
  if (style === "LEGAL") {
    const legalPrefixes = [
      "Il convient de",
      "Il est requis de",
      "Il y a lieu de",
      "L'équipe conformité doit",
      "Il est impératif de",
    ];
    const obligations = strippedLines.map((l, i) => {
      const enriched = applyLexicalUpgrades(l);
      const base = capitalizeSentences(enriched);
      if (/^(il convient|il est|il y a|l'équipe|conformément|en application)/i.test(base)) {
        return endSentence(base);
      }
      const prefix = legalPrefixes[i % legalPrefixes.length];
      const lower = base.charAt(0).toLowerCase() + base.slice(1);
      return endSentence(`${prefix} ${lower}`);
    });
    const numbered =
      obligations.length > 1
        ? obligations.map((o, i) => `${i + 1}. ${o}`).join("\n")
        : obligations[0];
    const legalIntro =
      pillar === "LAB_FT"
        ? "En application des dispositions LCB-FT en vigueur (Circulaire CTAF, Loi n° 2015-26), les obligations suivantes ont été identifiées :"
        : pillar === "CONFORMITE_REGLEMENTAIRE"
        ? "En vertu des exigences réglementaires applicables au secteur de l'assurance, les obligations suivantes ont été identifiées :"
        : "Conformément aux règles de gouvernance interne de MAE Assurance, les obligations suivantes ont été identifiées :";
    return {
      title: `[Obligation Réglementaire] ${enrichedTitle}`,
      text: `${legalIntro}\n\n${numbered}`,
    };
  }

  // ── MODE FORMEL (défaut) ─────────────────────────────────────────────────
  const formalIntro =
    pillar === "LAB_FT"
      ? "Dans le cadre du dispositif de Lutte Contre le Blanchiment et le Financement du Terrorisme (LCB-FT),"
      : pillar === "CONFORMITE_REGLEMENTAIRE"
      ? "Dans le cadre du programme de conformité réglementaire de MAE Assurance,"
      : "Dans le cadre du suivi de gouvernance et de conformité interne,";

  const sentences = strippedLines.map((l) => {
    const enriched = applyLexicalUpgrades(l);
    const base = capitalizeSentences(enriched);
    // Compléter les phrases trop courtes avec contexte
    const wordCount = base.split(/\s+/).length;
    if (wordCount < 6) {
      return endSentence(`${base} (point relevé ${pillarCtx})`);
    }
    return endSentence(base);
  });

  const prose = sentences.join(" ");
  let formalText = `${formalIntro} le point suivant a été relevé :\n\n${prose}`;

  if (strippedLines.length <= 2) {
    formalText += `\n\nCe point est signalé à l'attention de l'équipe concernée pour suivi et traitement dans les meilleurs délais.`;
  }

  return {
    title: enrichedTitle,
    text: formalText,
  };
}



export async function generateAutoTitleAction(params: {
  content: string;
  pillar?: MemoPillar;
  sectionLabel?: string;
}): Promise<{ title: string }> {
  const { content, pillar, sectionLabel } = params;

  if (!content || !content.trim()) {
    return { title: sectionLabel ? `Note — ${sectionLabel}` : "Note de conformité" };
  }

  const trimmed = content.trim();

  // 1. Essai avec Groq API si configuré pour un résumé synthétique de haut niveau
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    try {
      const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile" || "llama3-8b-8192";
      const prompt = `Tu es un expert en synthèse et conformité d'assurance MAE.
Rédige un TITRE SYNTHÉTIQUE court, percutant et professionnel (entre 4 et 8 mots maximum) résumant fidèlement le problème, le constat ou la consigne énoncée dans le texte ci-dessous.
IMPORTANT : Ne recopie pas bêtement le début du texte ! Formule un vrai titre de synthèse (Exemples : 'Non-persistance colonne Agent éditeur (Pagination)', 'Blocage des transactions suspectes PEP', 'Mise à jour cartographie des risques').
Reste strictement fidèle aux termes et aux faits sans aucune invention.
Réponds STRICTEMENT sous format JSON : { "title": "Ton titre synthétique" }

TEXTE À RÉSUMER :
"""
${trimmed}
"""`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "Tu es un assistant expert qui répond exclusivement par un objet JSON { \"title\": \"...\" }." },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const contentStr = data?.choices?.[0]?.message?.content;
        if (contentStr) {
          const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.title && typeof parsed.title === "string" && parsed.title.trim().length > 3) {
              return { title: parsed.title.trim().replace(/^["']|["']$/g, "") };
            }
          }
        }
      }
    } catch (err) {
      console.warn("[TITLE AI] Groq attempt error, falling back:", err);
    }
  }

  // 2. Essai avec Gemini API si configuré
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const geminiPrompt = `Rédige un TITRE COURT ET SYNTHÉTIQUE (4 à 8 mots max) résumant ce constat de conformité : "${trimmed}". Réponds uniquement par { "title": "..." } au format JSON.`;
      
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const textResp = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResp) {
          const parsed = JSON.parse(textResp);
          if (parsed.title) {
            return { title: parsed.title.trim().replace(/^["']|["']$/g, "") };
          }
        }
      }
    } catch (geminiErr) {
      console.warn("[TITLE AI] Gemini attempt error:", geminiErr);
    }
  }

  // 3. Fallback NLP sémantique haute fidélité (0ms, synthèse grammaticale)
  const localTitle = extractFaithfulTitle(trimmed, pillar, sectionLabel);
  return { title: localTitle };
}
