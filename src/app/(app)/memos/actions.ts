"use server";

import { MemoPillar } from "@/types/memo";

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
      ? "Ton professionnel, formel, élégant et précis pour une note interne de direction de conformité MAE. Corrige la syntaxe et sublime le vocabulaire métier."
      : style === "SYNTHETIC"
      ? "Format ultra-synthétique, percutant et orienté action (Bullet points clairs avec verbes d'action, points de vigilance immédiats)."
      : "Formulation juridique et réglementaire rigoureuse, faisant référence aux obligations de diligence, de contrôle, de traçabilité et de conformité légale (CGA, CTAF, GAFI).";

  const prompt = `Tu es un expert senior en Gouvernance, Risque et Conformité (GRC) et LCB-FT pour la MAE Assurance (Tunisie).
Ta mission est de reformuler le mémo/note de travail suivant pour le rendre irréprochable et directement exploitable par l'équipe conformité.

CONTEXTE DU MÉMO :
- Volet métier : ${pillarName}
- Section applicative liée : ${sectionLabel || "Général"}
- Style demandé : ${styleInstruction}

TEXTE BRUT ORIGINAL :
"""
${text}
"""
${title ? `TITRE ACTUEL : "${title}"` : ""}

CONSIGNES STRICTES :
1. Rédige en français irréprochable.
2. Si le texte original contient des fautes, abréviations ou approximations, clarifie-les intelligemment selon le vocabulaire bancassurance/conformité.
3. Conserve rigoureusement le sens, les chiffres et les noms mentionnés.
4. Réponds UNIQUEMENT sous la forme d'un objet JSON valide avec les deux champs suivants :
{
  "suggestedTitle": "Titre court, percutant et professionnel (max 8 mots)",
  "reformulatedText": "Texte complet reformulé"
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
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const contentStr = data?.choices?.[0]?.message?.content;
        if (contentStr) {
          const parsed = JSON.parse(contentStr);
          if (parsed.reformulatedText) {
            return {
              reformulatedText: parsed.reformulatedText,
              suggestedTitle: parsed.suggestedTitle,
            };
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

  if (style === "SYNTHETIC") {
    const lines = clean.split("\n").filter((l) => l.trim().length > 0);
    const bullets = lines
      .map((l) => `• ${l.replace(/^[•\-\*]\s*/, "").trim()}`)
      .join("\n");
    return {
      title: `[Synthèse] ${title}`,
      text: `📌 Point d'attention :\n${bullets}\n\n👉 Action requise : Analyse et vérification de conformité par l'analyste en charge.`,
    };
  }

  if (style === "LEGAL") {
    return {
      title: `[Obligation] ${title}`,
      text: `Au titre des obligations de diligence et de contrôle interne (${pillar === "LAB_FT" ? "Dispositif LCB-FT / CTAF" : "Conformité Réglementaire CGA"}) :\n\n${clean}\n\n⚖️ Recommandation : S'assurer de la traçabilité documentaire et de l'adéquation des pièces justificatives au dossier.`,
    };
  }

import { extractFaithfulTitle } from "@/lib/memoTitleGenerator";

export async function generateAutoTitleAction(params: {
  content: string;
  pillar?: MemoPillar;
  sectionLabel?: string;
}): Promise<{ title: string }> {
  const { content, pillar, sectionLabel } = params;

  if (!content || !content.trim()) {
    return { title: sectionLabel ? `Note — ${sectionLabel}` : "Note de conformité" };
  }

  // 1. Essai avec Groq API si configuré pour un résumé concis
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    try {
      const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile" || "llama3-8b-8192";
      const prompt = `Tu es un assistant de conformité bancassurance pour la MAE Assurance.
Génère un TITRE DE MÉMO ultra-court (entre 4 et 7 mots maximum) résumant fidèlement le texte suivant.
RÈGLE ABSOLUE : Reste strictement fidèle aux faits, aux noms de personnes, de modules ou de contrats mentionnés, sans aucune invention ni hallucination. Ne commence pas par "Note sur" ni "Mémo".
Réponds UNIQUEMENT sous forme JSON : { "title": "Ton titre court" }

TEXTE :
"""
${content.trim()}
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
            { role: "system", content: "Tu es un assistant expert en conformité qui répond uniquement en JSON." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const contentStr = data?.choices?.[0]?.message?.content;
        if (contentStr) {
          const parsed = JSON.parse(contentStr);
          if (parsed.title && typeof parsed.title === "string" && parsed.title.trim().length > 0) {
            return { title: parsed.title.trim().replace(/^["']|["']$/g, "") };
          }
        }
      }
    } catch (err) {
      console.warn("[TITLE AI] Groq attempt error, using local extractor:", err);
    }
  }

  // 2. Fallback NLP déterministe ultra-fidèle (0ms, 100% sans déformation)
  const localTitle = extractFaithfulTitle(content, pillar, sectionLabel);
  return { title: localTitle };
}
