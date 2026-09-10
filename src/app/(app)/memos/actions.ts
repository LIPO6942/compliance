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
              content: "Tu es un assistant IA expert en conformité d'assurance MAE. Tu réponds exclusivement en JSON valide.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
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

function generateRuleBasedReformulation(
  rawText: string,
  rawTitle?: string,
  pillar?: MemoPillar,
  style?: "FORMAL" | "SYNTHETIC" | "LEGAL"
): { text: string; title: string } {
  const clean = rawText.trim();
  const title = rawTitle?.trim() || "Point de vigilance Conformité";

  // Helpers
  const capitalizeSentences = (t: string) =>
    t.replace(/(^|[.!?]\s+)([a-z])/g, (m, p, c) => p + c.toUpperCase());

  const expandAbbreviations = (t: string) =>
    t
      .replace(/\bKYC\b/g, "Know Your Customer (KYC)")
      .replace(/\bPEP\b/g, "Personne Politiquement Exposée (PEP)")
      .replace(/\bAML\b/g, "Anti-Money Laundering (AML)")
      .replace(/\bLAB\/FT\b/gi, "LCB-FT");

  // Split lines and strip bullet markers
  const rawLines = clean.split("\n").filter((l) => l.trim().length > 0);
  const strippedLines = rawLines.map((l) => l.replace(/^[📌•\-\*]\s*/, "").trim());

  if (style === "SYNTHETIC") {
    // Format as concise bullet points
    const bullets = strippedLines
      .map((l) => `• ${capitalizeSentences(expandAbbreviations(l))}`)
      .join("\n");
    return {
      title: `[Synthèse] ${title}`,
      text: `📌 Point d'attention :\n${bullets}`,
    };
  }

  if (style === "LEGAL") {
    // Convert each line to a full formal compliance sentence
    const sentences = strippedLines.map((l) => {
      const base = capitalizeSentences(expandAbbreviations(l));
      // If the line starts with a verb in infinitive form, prefix with "Il convient de"
      if (/^(expliquer|vérifier|contrôler|s'assurer|mettre|corriger|supprimer|ajouter|modifier)/i.test(base)) {
        return `Il convient de ${base.charAt(0).toLowerCase() + base.slice(1)}.`;
      }
      return base.endsWith(".") ? base : `${base}.`;
    });
    return {
      title: `[Obligation] ${title}`,
      text: sentences.join("\n"),
    };
  }

  // FORMAL Default — convert notes to professional prose sentences
  const sentences = strippedLines.map((l) => {
    const base = capitalizeSentences(expandAbbreviations(l));
    return base.endsWith(".") || base.endsWith(":") ? base : `${base}.`;
  });
  return {
    title: title,
    text: sentences.join(" "),
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
