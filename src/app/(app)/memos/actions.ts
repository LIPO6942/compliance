"use server";

import { MemoPillar } from "@/types/memo";
import { extractFaithfulTitle } from "@/lib/memoTitleGenerator";

export type MemoAIStyle = "FORMAL" | "SYNTHETIC" | "LEGAL" | "CLARITY" | "CHECKLIST";

export interface ReformulateMemoParams {
  text: string;
  title?: string;
  pillar: MemoPillar;
  style: MemoAIStyle;
  sectionLabel?: string;
}

export interface ReformulateMemoResult {
  reformulatedText?: string;
  suggestedTitle?: string;
  suggestedChecklist?: string[];
  framingAnalysis?: string;
  error?: string;
}

export interface ChatWithMemoAIParams {
  userPrompt: string;
  history?: { role: "user" | "assistant"; content: string }[];
  currentMemoText?: string;
  currentMemoTitle?: string;
  pillar: MemoPillar;
  sectionLabel?: string;
  customApiKey?: string;
}

export interface ChatWithMemoAIResult {
  reply: string;
  framingAnalysis: string;
  suggestedTitle: string;
  suggestedContent: string;
  suggestedChecklist: string[];
  providerUsed?: string;
  error?: string;
}

export interface ImproveMemoWithAIParams {
  rawText: string;
  pillar: MemoPillar;
  sectionLabel?: string;
  customApiKey?: string;
}

export interface ImproveMemoWithAIResult {
  summaryTitle: string;
  organizedText: string;
  suggestedChecklist: string[];
  providerUsed?: string;
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
      ? `FORMEL & DIRECTION — Transforme ce texte brut en note de synthèse professionnelle de haut niveau pour la direction générale et le comité de contrôle. Phrases complètes, articulation logique (Constat / Analyse / Recommandation), vocabulaire châtié et précis de conformité d'assurance.`
      : style === "SYNTHETIC"
      ? `SYNTHÉTIQUE & ACTIONS — Reformate en points d'action concis, percutants et hiérarchisés par priorité. Chaque point commence par "•" avec un verbe d'action fort à l'infinitif. Supprime tout mot superflu. Format : "📌 Points d'attention :\n• Action 1\n• Action 2"`
      : style === "LEGAL"
      ? `RÉGLEMENTAIRE & LCB-FT — Reformule chaque constat ou consigne sous l'angle des obligations normatives et réglementaires applicables (circulaires CTAF, directives CGA, décrets-lois LCB-FT et conformité prudentielle). Utilise des formules juridiques formelles ("Il est requis de", "En application de", "Il y a lieu de procéder à").`
      : style === "CLARITY"
      ? `CLARTÉ & ORTHOGRAPHE — Corrige toutes les fautes d'orthographe, de ponctuation, de grammaire et d'accord. Élimine les maladresses et tournures familières tout en préservant fidèlement la concision, la structure et le sens original de la note.`
      : `PLAN D'ACTIONS & CHECKLIST — Transforme le texte en un plan de contrôle pratique avec une brève introduction suivie d'une liste claire de tâches de vérification ou d'actions concrètes à cocher. Renseigne impérativement le tableau "suggestedChecklist" avec les actions à cocher.`;

  const prompt = `Tu es un expert senior en Gouvernance, Risque et Conformité (GRC) pour la MAE Assurance (Tunisie).
Ta mission est de TRANSFORMER et d'AMÉLIORER SIGNIFICATIVEMENT le texte brut ci-dessous selon le style demandé. Le résultat doit être impeccable, structuré et immédiatement exploitable.

VOLET MÉTIER : ${pillarName}
SECTION : ${sectionLabel || "Général"}

TEXTE BRUT À AMÉLIORER :
"""
${text}
"""
${title ? `TITRE ACTUEL : "${title}"` : ""}

TRANSFORMATION DEMANDÉE : ${styleInstruction}

RÈGLES ABSOLUES :
1. Le résultat doit être NETTEMENT meilleur et plus professionnel que l'original.
2. Corrige rigoureusement toute faute de grammaire, orthographe, accord et syntaxe.
3. Reste strictement fidèle aux faits sans inventer d'informations fictives.
4. Si le texte contient des actions concrètes à mener, extrais-les également dans "suggestedChecklist" sous forme de phrases courtes à l'infinitif.
5. Réponds UNIQUEMENT sous cette forme JSON valide :
{
  "suggestedTitle": "Titre court et professionnel (max 8 mots)",
  "reformulatedText": "Texte transformé complet",
  "suggestedChecklist": ["Action 1 à vérifier", "Action 2 à vérifier"]
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
              content: "Tu es un expert senior en GRC MAE Assurance. Tu améliores avec excellence le texte fourni en JSON strict.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
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
                suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : undefined,
              };
            }
          }
        }
      }
    } catch (groqErr) {
      console.warn("[MEMO AI] Groq attempt error:", groqErr);
    }
  }

  // 2. Essai avec Gemini API si configuré
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const textResp = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResp) {
          const parsed = JSON.parse(textResp);
          if (parsed.reformulatedText) {
            return {
              reformulatedText: parsed.reformulatedText,
              suggestedTitle: parsed.suggestedTitle,
              suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : undefined,
            };
          }
        }
      }
    } catch (geminiErr) {
      console.warn("[MEMO AI] Gemini attempt error:", geminiErr);
    }
  }

  // 3. Fallback Intelligent NLP haute fidélité
  const fallback = generateRuleBasedReformulation(text, title, pillar, style);
  return {
    reformulatedText: fallback.text,
    suggestedTitle: fallback.title,
    suggestedChecklist: fallback.checklist,
  };
}

// ─── Dictionnaire d'enrichissement lexical métier ───────────────────────────
const LEXICAL_UPGRADES: [RegExp, string][] = [
  [/\bfiltrage\b/gi, "filtrage et identification"],
  [/\bpar agence\b/gi, "par agence commerciale"],
  [/\bsucc digitale?\b/gi, "succursale digitale"],
  [/\bsucc\b/gi, "succursale"],
  [/\bpb\b/gi, "problème technique"],
  [/\bpbs\b/gi, "problèmes techniques"],
  [/\bpas ok\b/gi, "non conforme"],
  [/\bko\b/gi, "non conforme"],
  [/\bok\b/gi, "conforme et validé"],
  [/\bvérif\b/gi, "vérification"],
  [/\bvérifs\b/gi, "vérifications"],
  [/\bregtools\b/gi, "RegTools"],
  [/\bmae\b/gi, "MAE Assurance"],
  [/\bKYC\b/g, "Know Your Customer (KYC)"],
  [/\bPEP\b/g, "Personne Politiquement Exposée (PEP/PPE)"],
  [/\bAML\b/g, "Anti-Money Laundering (AML)"],
  [/\bLAB\/FT\b/gi, "Lutte Contre le Blanchiment et le Financement du Terrorisme (LCB-FT)"],
  [/\bCTAF\b/g, "Commission Tunisienne des Analyses Financières (CTAF)"],
  [/\bCGA\b/g, "Comité Général des Assurances (CGA)"],
  [/\bDMR\b/g, "Dispositif de Maîtrise des Risques (DMR)"],
  [/\bGRC\b/g, "Gouvernance, Risque et Conformité (GRC)"],
  [/\bnb\b/gi, "à noter"],
  [/\bsvp\b/gi, "s'il vous plaît"],
  [/\binfo\b/gi, "information"],
  [/\binfos\b/gi, "informations"],
  [/\bpas fonctionnel\b/gi, "non fonctionnel — action corrective requise"],
  [/\bà corriger\b/gi, "à corriger impérativement"],
  [/\bà vérifier\b/gi, "à vérifier sans délai"],
  [/\bà faire\b/gi, "à traiter en priorité"],
  [/\bsuivi\b/gi, "suivi opérationnel"],
  [/\bcontrôle\b/gi, "contrôle de conformité"],
  [/\bds\b/gi, "dans"],
  [/\bclt\b/gi, "client"],
  [/\bclts\b/gi, "clients"],
  [/\brdv\b/gi, "rendez-vous"],
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
  return line.replace(/^[📌🎯⚠️•\-\*\d+\.\)\[\]\s]+/, "").trim();
}

function endSentence(s: string): string {
  return s.match(/[.!?:]$/) ? s : `${s}.`;
}

function generateRuleBasedReformulation(
  rawText: string,
  rawTitle?: string,
  pillar?: MemoPillar,
  style?: MemoAIStyle
): { text: string; title: string; checklist?: string[] } {
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

  // ── MODE CHECKLIST ────────────────────────────────────────────────────────
  if (style === "CHECKLIST") {
    const checklistItems = strippedLines.map((l) => {
      const enriched = capitalizeSentences(applyLexicalUpgrades(l));
      if (!/^(vérifier|contrôler|valider|mettre|documenter|s'assurer|transmettre|archiver)/i.test(enriched)) {
        return `Vérifier : ${enriched.charAt(0).toLowerCase() + enriched.slice(1)}`;
      }
      return enriched;
    });

    const bodyChecklist = checklistItems.map((item) => `[ ] ${endSentence(item)}`).join("\n");
    return {
      title: `[Checklist] ${enrichedTitle}`,
      text: `📋 Plan d'actions & Vérifications à opérer :\n\n${bodyChecklist}`,
      checklist: checklistItems,
    };
  }

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
      checklist: strippedLines.map((l) => capitalizeSentences(applyLexicalUpgrades(l))),
    };
  }

  // ── MODE CLARTÉ & ORTHOGRAPHE ─────────────────────────────────────────────
  if (style === "CLARITY") {
    const cleanSentences = strippedLines.map((l) => {
      const enriched = capitalizeSentences(applyLexicalUpgrades(l));
      return endSentence(enriched);
    });
    return {
      title: enrichedTitle,
      text: cleanSentences.join("\n\n"),
      checklist: strippedLines.length > 1 ? strippedLines : undefined,
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
      checklist: obligations,
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
    checklist: strippedLines.length > 1 ? strippedLines : undefined,
  };
}

// ─── Assistant IA Conversationnel & Moteur de Cadrage du Besoin ───────────────

export async function chatWithMemoAIAction(
  params: ChatWithMemoAIParams
): Promise<ChatWithMemoAIResult> {
  const { userPrompt, history = [], currentMemoText, currentMemoTitle, pillar, sectionLabel, customApiKey } = params;

  if (!userPrompt || !userPrompt.trim()) {
    return {
      reply: "Veuillez exprimer votre situation ou votre besoin pour que je puisse vous guider et rédiger votre mémo.",
      framingAnalysis: "",
      suggestedTitle: "",
      suggestedContent: "",
      suggestedChecklist: [],
      error: "Prompt vide",
    };
  }

  const pillarName =
    pillar === "LAB_FT"
      ? "Lutte Anti-Blanchiment et Financement du Terrorisme (LCB-FT)"
      : pillar === "CONFORMITE_REGLEMENTAIRE"
      ? "Conformité Réglementaire & Normative"
      : "Gouvernance & Conformité Générale";

  const systemPrompt = `Tu es l'Assistant IA Copilot Expert en Gouvernance, Risque et Conformité (GRC) pour la MAE Assurance (Tunisie).
L'utilisateur te consulte comme sur ChatGPT pour t'exposer une situation brute, un problème opérationnel, un constat ou une question, et souhaite que tu :
1. CADRES SON BESOIN AVEC EXCELLENCE :
   - Reformule la problématique, identifie les acteurs touchés (souscription, réseau agence, sinistre, trésorerie) et la criticité.
   - Détaille les risques encourus (sanctions CTAF, exigences prudentielles CGA, risque de fraude, responsabilité opérationnelle).
   - Rapproche la situation des obligations normatives (Circulaires CTAF 2017-01 et 2021, décrets CGA, loi 2015-26 modifiée relative à la LCB-FT).
2. AMÉLIORES ET RÉDIGES LA NOTE DE CONFORMITÉ (MÉMO) :
   - Rédige un titre percutant et professionnel (4 à 8 mots max).
   - Rédige un contenu de mémo soigné, structuré avec logique : Constat / Consignes applicables / Justification et traçabilité.
3. CONSTRUISES UN PLAN D'ACTIONS CONCRET (CHECKLIST) :
   - 3 à 5 points de vérification précis à l'infinitif.

Réponds OBLIGATOIREMENT sous la forme d'un objet JSON strict :
{
  "reply": "Ta réponse conversationnelle comme ChatGPT : bienveillante, rigoureuse et explicative.",
  "framingAnalysis": "Cadrage détaillé du besoin : Diagnostic, Enjeux, Risques et Références réglementaires.",
  "suggestedTitle": "Titre professionnel synthétique",
  "suggestedContent": "Texte rédigé complet du mémo, structuré et directement exploitable.",
  "suggestedChecklist": ["Action 1 à vérifier", "Action 2 à contrôler"]
}`;

  const formattedMessages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
    {
      role: "user",
      content: `CONTEXTE ACTUEL DU MÉMO :
Volet : ${pillarName}
Section : ${sectionLabel || "Général"}
${currentMemoTitle ? `Titre actuel : "${currentMemoTitle}"` : ""}
${currentMemoText ? `Contenu actuel :\n"""${currentMemoText}"""` : ""}

DEMANDE DU COLLABORATEUR :
"""
${userPrompt}
"""`,
    },
  ];

  // 1. Essai avec Groq API si clé configurée (custom ou env)
  const groqKey = customApiKey?.startsWith("gsk_") ? customApiKey : process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile" || "llama3-8b-8192";
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const contentStr = data?.choices?.[0]?.message?.content;
        if (contentStr) {
          const parsed = JSON.parse(contentStr);
          if (parsed.suggestedContent || parsed.reply) {
            return {
              reply: parsed.reply || "J'ai cadré votre besoin et rédigé votre mémo de conformité.",
              framingAnalysis: parsed.framingAnalysis || "",
              suggestedTitle: parsed.suggestedTitle || (currentMemoTitle || "Note de Conformité"),
              suggestedContent: parsed.suggestedContent || userPrompt,
              suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : [],
              providerUsed: "Groq (Llama-3.3 70B)",
            };
          }
        }
      }
    } catch (e) {
      console.warn("[MEMO CHAT AI] Groq attempt error:", e);
    }
  }

  // 2. Essai avec Gemini API si clé configurée (custom ou env)
  const geminiKey = customApiKey?.startsWith("AIza") ? customApiKey : process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${formattedMessages[formattedMessages.length - 1].content}` }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const textResp = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResp) {
          const parsed = JSON.parse(textResp);
          if (parsed.suggestedContent || parsed.reply) {
            return {
              reply: parsed.reply || "J'ai cadré votre besoin et rédigé votre mémo de conformité.",
              framingAnalysis: parsed.framingAnalysis || "",
              suggestedTitle: parsed.suggestedTitle || (currentMemoTitle || "Note de Conformité"),
              suggestedContent: parsed.suggestedContent || userPrompt,
              suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : [],
              providerUsed: "Google Gemini 1.5 Flash",
            };
          }
        }
      }
    } catch (e) {
      console.warn("[MEMO CHAT AI] Gemini attempt error:", e);
    }
  }

  // 3. Essai avec OpenAI API si clé configurée (custom ou env)
  const openaiKey = customApiKey?.startsWith("sk-") ? customApiKey : process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: formattedMessages,
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const contentStr = data?.choices?.[0]?.message?.content;
        if (contentStr) {
          const parsed = JSON.parse(contentStr);
          if (parsed.suggestedContent || parsed.reply) {
            return {
              reply: parsed.reply || "J'ai cadré votre besoin et rédigé votre mémo de conformité.",
              framingAnalysis: parsed.framingAnalysis || "",
              suggestedTitle: parsed.suggestedTitle || (currentMemoTitle || "Note de Conformité"),
              suggestedContent: parsed.suggestedContent || userPrompt,
              suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : [],
              providerUsed: "OpenAI GPT-4o-mini",
            };
          }
        }
      }
    } catch (e) {
      console.warn("[MEMO CHAT AI] OpenAI attempt error:", e);
    }
  }

  // 4. Moteur Cognitif Expert GRC (Autonome, zéro dépendance réseau)
  return generateCognitiveFramingAndMemo(userPrompt, currentMemoText, currentMemoTitle, pillar, sectionLabel);
}

function generateCognitiveFramingAndMemo(
  prompt: string,
  existingText?: string,
  existingTitle?: string,
  pillar?: MemoPillar,
  sectionLabel?: string
): ChatWithMemoAIResult {
  const combined = `${prompt} ${existingText || ""}`.toLowerCase();

  // Détection de la thématique dominante
  const isLcbFt = /blanchiment|terrorisme|ctaf|soupçon|tracfin|pep|ppe|gel|avoirs|illicite|espèces|cash|seuil/i.test(combined);
  const isKyc = /kyc|pièce|identité|cin|passeport|rne|registre|bénéficiaire|actionnaire|société|justificatif|domicile|client/i.test(combined);
  const isAgency = /agence|succursale|commercial|vendeur|guichet|caisse|encaissement|délégation|souscription/i.test(combined);
  const isSinistre = /sinistre|indemnisation|fraude|expert|fausse déclaration|remboursement|expertise/i.test(combined);
  const isReglementaire = /cga|circulaire|décret|loi|article|conformité|audit|contrôle|dmr/i.test(combined);

  let themeTitle = "Note de Cadrage & Conformité";
  let diagnostic = "";
  let risks = "";
  let regulatoryRef = "";
  let memoBody = "";
  let checklist: string[] = [];

  if (isLcbFt) {
    themeTitle = "Contrôle LCB-FT & Vigilance Opérationnelle";
    diagnostic = "La situation soumise met en jeu les obligations strictes de vigilance et de surveillance des flux financiers au sein de la MAE Assurance. Il est impératif d'écarter tout risque de circuit opaque ou de contournement des règles prudentielles.";
    risks = "Risque majeur de non-conformité vis-à-vis de la CTAF, sanctions pécuniaires pour l'établissement, blocage des opérations et mise en cause de la responsabilité de la direction de conformité.";
    regulatoryRef = "Loi organique n°2015-26 modifiée et Circulaires de la Commission Tunisienne des Analyses Financières (CTAF) relatives à l'obligation de vigilance constante.";
    memoBody = `Dans le cadre du renforcement impératif du dispositif LCB-FT de la MAE Assurance, le point suivant est formalisé pour application immédiate :\n\n1. CONSTAT : ${prompt.trim()}\n\n2. DIRECTIVES APPLICABLES :\n• Tout flux atypique ou dépassement de seuil doit faire l'objet d'une justification formelle de l'origine licite des fonds avant toute validation.\n• Procéder sans délai au gel conservatoire de l'opération en cas de doute persistant ou d'absence de justificatif probant.\n• Consigner la fiche d'incident et la transmettre au Responsable Conformité / LCB-FT pour examen d'une éventuelle déclaration de soupçon.\n\n3. TRAÇABILITÉ : Aucun passe-droit ou dérogation verbale n'est toléré sans visa écrit préalable de la Direction de la Conformité.`;
    checklist = [
      "Vérifier la complétude des justificatifs économiques et de l'origine des fonds",
      "Contrôler le filtrage du client sur les listes de sanctions et bases PEP/PPE",
      "Suspendre l'opération en attente de validation du Responsable Conformité",
      "Archiver l'intégralité des échanges dans le dossier de conformité",
      "Évaluer l'opportunité d'une Déclaration de Soupçon (DS) auprès de la CTAF"
    ];
  } else if (isKyc) {
    themeTitle = "Mise en Conformité Dossier Client (KYC / RNE)";
    diagnostic = "Le besoin porte sur l'identification rigoureuse et la mise à jour des éléments probants constitutifs du dossier 'Know Your Customer' (KYC) pour les assurés ou bénéficiaires effectifs.";
    risks = "Inopposabilité contractuelle, risque d'usurpation d'identité, rejet lors des contrôles périodiques du CGA et défaut de traçabilité des ayants droit.";
    regulatoryRef = "Code des Assurances tunisien et Directives du Comité Général des Assurances (CGA) sur le devoir de vérification de l'identité des souscripteurs.";
    memoBody = `Pour garantir la stricte conformité des souscriptions au sein de MAE Assurance, les règles d'identification client sont réaffirmées :\n\n1. CONSTAT & OBJECTIF : ${prompt.trim()}\n\n2. EXIGENCES FORMELLES :\n• Vérifier systématiquement la validité des pièces d'identité officielles (CIN pour les personnes physiques, extrait RNE de moins de 3 mois pour les personnes morales).\n• Identifier formellement les Bénéficiaires Effectifs Ultimes (UBO) détenant plus de 20% du capital.\n• Refuser toute validation définitive tant que le dossier documentaire n'est pas exhaustif.\n\n3. AUDIT : Les dossiers incomplets seront signalés lors des revues de contrôle permanent.`;
    checklist = [
      "Exiger la copie certifiée conforme de la pièce d'identité en cours de validité",
      "Télécharger l'extrait du Registre National des Entreprises (RNE) récent",
      "Identifier et documenter les bénéficiaires effectifs et ayants droit",
      "Bloquer la souscription tant que les pièces obligatoires sont manquantes"
    ];
  } else if (isAgency) {
    themeTitle = "Consigne Réseau Commercial & Procédure Agences";
    diagnostic = "Cette note vise à encadrer les pratiques du réseau des agences et succursales pour assurer une stricte homogénéité dans l'application des procédures de souscription et d'encaissement.";
    risks = "Risque d'erreurs récurrentes en agence, écarts de caisse, non-respect des délégations de pouvoir et sanctions internes.";
    regulatoryRef = "Manuel de procédures internes MAE Assurance et Dispositif de Maîtrise des Risques Opérationnels (DMR).";
    memoBody = `À l'attention de l'ensemble des responsables d'agences et succursales :\n\n1. RAPPEL DU CONSTAT : ${prompt.trim()}\n\n2. INSTRUCTIONS OPÉRATIONNELLES :\n• Se conformer strictement au barème de délégation et aux plafonds autorisés sans dérogation unilatérale.\n• S'assurer que chaque opération saisie dans le système est appuyée par une pièce justificative numérisée.\n• Effectuer un rapprochement quotidien entre les pièces physiques et les données du système d'information.\n\n3. CONTRÔLE : Les inspecteurs de réseau procéderont à des vérifications inopinées sur la conformité de ces consignes.`;
    checklist = [
      "Notifier la consigne à l'ensemble des collaborateurs du réseau d'agences",
      "Vérifier le respect des plafonds et des seuils d'autorisation",
      "Contrôler la présence des pièces justificatives numérisées dans le SI",
      "Programmer un point de contrôle avec l'inspection commerciale"
    ];
  } else if (isSinistre) {
    themeTitle = "Contrôle des Dossiers Sinistres & Prévention Fraude";
    diagnostic = "Le signalement concerne un dossier d'indemnisation ou une procédure de sinistre présentant des zones d'ombre nécessitant des investigations approfondies avant tout décaissement.";
    risks = "Pertes financières par sur-indemnisation ou fraude organisée, dégradation du ratio combiné et risque de contentieux.";
    regulatoryRef = "Dispositif interne de lutte contre la fraude à l'assurance et Code des Assurances (dispositions relatives aux fausses déclarations intentionnelles).";
    memoBody = `Dans le cadre de la protection des actifs et de la prévention de la fraude aux sinistres :\n\n1. EXPOSÉ DE LA SITUATION : ${prompt.trim()}\n\n2. CONSIGNES D'INSTRUCTION :\n• Suspendre le règlement jusqu'à obtention du rapport d'expertise contradictoire et vérification de la cohérence des circonstances.\n• Procéder à un croisement avec l'historique des sinistres antérieurs de l'assuré.\n• En cas d'incohérence avérée, saisir la cellule anti-fraude et la Direction Juridique pour avis motivé.`;
    checklist = [
      "Vérifier la concordance des déclarations initiales avec le constat d'expertise",
      "Consulter l'historique des sinistres antérieurs de l'assuré sur 3 ans",
      "Suspendre l'ordre de virement d'indemnisation à titre conservatoire",
      "Rédiger une note de synthèse pour la cellule anti-fraude"
    ];
  } else {
    themeTitle = existingTitle || "Instruction de Gouvernance & Suivi Opérationnel";
    diagnostic = "Le besoin formulé nécessite d'établir une note de cadrage claire, traçable et directement opposable aux parties prenantes pour fluidifier les opérations tout en respectant les standards de conformité.";
    risks = "Manque de traçabilité, incompréhension des consignes, retards de traitement et risque opérationnel résiduel.";
    regulatoryRef = "Référentiel de gouvernance et de contrôle interne MAE Assurance.";
    memoBody = `Note de service et de cadrage opérationnel :\n\n1. OBJET & CONTEXTE : ${prompt.trim()}\n\n2. DIRECTIVES FORMELLES :\n• Les équipes concernées sont invitées à appliquer immédiatement les mesures correctives nécessaires.\n• Assurer un enregistrement rigoureux de l'état d'avancement dans les outils de suivi prévus à cet effet.\n• Faire remonter toute difficulté d'application ou blocage sans délai.\n\n3. ÉCHÉANCE : Mise en conformité attendue sous le contrôle du responsable de section.`;
    checklist = [
      "Informer les intervenants clés de la consigne établie",
      "Mettre à jour le statut dans l'outil de gestion",
      "Contrôler l'effectivité de la mise en œuvre sous 48 heures"
    ];
  }

  const framingAnalysis = `🎯 CADRAGE DU BESOIN & DIAGNOSTIC :\n${diagnostic}\n\n⚠️ RISQUES & ENJEUX IDENTIFIÉS :\n${risks}\n\n📜 FONDEMENT RÉGLEMENTAIRE & NORMATIF :\n${regulatoryRef}`;

  return {
    reply: `J'ai analysé votre situation et cadré votre besoin avec rigueur selon les standards de la MAE Assurance. Voici la note structurée prête à l'emploi que vous pouvez insérer dans votre mémo :`,
    framingAnalysis,
    suggestedTitle: themeTitle,
    suggestedContent: memoBody,
    suggestedChecklist: checklist,
    providerUsed: "Moteur Cognitif Expert GRC (Autonome)",
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

// ─── AMÉLIORATION DIRECTE ET SIMPLIFIÉE DU MÉMO VIA IA ──────────────────────
// Prend les notes brutes de l'utilisateur, résume le sujet dans le titre,
// et reformule le corps de manière professionnelle et organisée avec des points (•).

export async function improveMemoWithAIAction(
  params: ImproveMemoWithAIParams
): Promise<ImproveMemoWithAIResult> {
  const { rawText, pillar, sectionLabel, customApiKey } = params;

  if (!rawText || !rawText.trim()) {
    return {
      summaryTitle: "",
      organizedText: "",
      suggestedChecklist: [],
      error: "Veuillez saisir des notes ou du texte avant de lancer l'amélioration.",
    };
  }

  const pillarName =
    pillar === "LAB_FT"
      ? "Lutte Anti-Blanchiment et Financement du Terrorisme (LCB-FT)"
      : pillar === "CONFORMITE_REGLEMENTAIRE"
      ? "Conformité Réglementaire & Normative"
      : "Gouvernance & Conformité Générale";

  const prompt = `Tu es un expert senior en Gouvernance, Risque et Conformité (GRC) pour la MAE Assurance (Tunisie).
L'utilisateur a écrit des notes informelles ou du texte brut ci-dessous.

TA MISSION EST DE RÉALISER CETTE AMÉLIORATION EN 3 POINTS STRICTS :
1. LE TITRE DOIT ÊTRE LE RÉSUMÉ SYNTHÉTIQUE DU SUJET ("summaryTitle") :
   - Rédige un titre percutant, professionnel et court (entre 4 et 8 mots maximum) qui résume parfaitement le sujet traité.
   - Ne pas inventer de faits extérieurs.

2. LE TEXTE DOIT ÊTRE AMÉLIORÉ DE FAÇON PROFESSIONNELLE ET ORGANISÉE AVEC DES POINTS CLAIRS ("organizedText") :
   - Formule exactement ce qui est demandé avec un ton professionnel, clair et percutant.
   - Structure le corps de la note avec des tirets ou puces ("• Point 1", "• Point 2", ...).
   - Corrige rigoureusement toute faute d'orthographe, de grammaire et maladresse de style.
   - Utilise le vocabulaire précis de la conformité d'assurance (procédures, vérifications, traçabilité, conformité).

3. EXTRAIRE LA CHECKLIST D'ACTIONS CONCRÈTES ("suggestedChecklist") :
   - 2 à 4 actions courtes à l'infinitif à vérifier ou cocher.

RÉPONDS STRICTEMENT SOUS FORME D'OBJET JSON :
{
  "summaryTitle": "Titre résumé du sujet",
  "organizedText": "Texte professionnel organisé avec des points (•)",
  "suggestedChecklist": ["Action 1 à vérifier", "Action 2 à contrôler"]
}

VOLET : ${pillarName}
SECTION : ${sectionLabel || "Général"}
NOTES BRUTES :
"""
${rawText.trim()}
"""`;

  // 1. Essai avec Groq API si clé configurée
  const groqKey = customApiKey?.startsWith("gsk_") ? customApiKey : process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile" || "llama3-8b-8192";
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "Tu es un expert senior en GRC d'assurance. Tu réponds exclusivement en JSON strict." },
            { role: "user", content: prompt },
          ],
          temperature: 0.25,
          response_format: { type: "json_object" },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const contentStr = data?.choices?.[0]?.message?.content;
        if (contentStr) {
          const parsed = JSON.parse(contentStr);
          if (parsed.organizedText || parsed.summaryTitle) {
            return {
              summaryTitle: parsed.summaryTitle || extractFaithfulTitle(rawText, pillar, sectionLabel),
              organizedText: parsed.organizedText || rawText,
              suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : [],
              providerUsed: "Groq Llama-3.3",
            };
          }
        }
      }
    } catch (e) {
      console.warn("[IMPROVE MEMO] Groq attempt error:", e);
    }
  }

  // 2. Essai avec Gemini API si clé configurée
  const geminiKey = customApiKey?.startsWith("AIza") ? customApiKey : process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.25 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const textResp = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResp) {
          const parsed = JSON.parse(textResp);
          if (parsed.organizedText || parsed.summaryTitle) {
            return {
              summaryTitle: parsed.summaryTitle || extractFaithfulTitle(rawText, pillar, sectionLabel),
              organizedText: parsed.organizedText || rawText,
              suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : [],
              providerUsed: "Google Gemini",
            };
          }
        }
      }
    } catch (e) {
      console.warn("[IMPROVE MEMO] Gemini attempt error:", e);
    }
  }

  // 3. Essai avec OpenAI API si clé configurée
  const openaiKey = customApiKey?.startsWith("sk-") ? customApiKey : process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Tu es un expert senior en GRC d'assurance. Tu réponds exclusivement en JSON strict." },
            { role: "user", content: prompt },
          ],
          temperature: 0.25,
          response_format: { type: "json_object" },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const contentStr = data?.choices?.[0]?.message?.content;
        if (contentStr) {
          const parsed = JSON.parse(contentStr);
          if (parsed.organizedText || parsed.summaryTitle) {
            return {
              summaryTitle: parsed.summaryTitle || extractFaithfulTitle(rawText, pillar, sectionLabel),
              organizedText: parsed.organizedText || rawText,
              suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : [],
              providerUsed: "OpenAI GPT-4o-mini",
            };
          }
        }
      }
    } catch (e) {
      console.warn("[IMPROVE MEMO] OpenAI attempt error:", e);
    }
  }

  // 4. Moteur Cognitif Autonome (instantané et 100% robuste)
  return generateAutonomousOrganizedMemo(rawText, pillar, sectionLabel);
}

function generateAutonomousOrganizedMemo(
  rawText: string,
  pillar?: MemoPillar,
  sectionLabel?: string
): ImproveMemoWithAIResult {
  const summaryTitle = extractFaithfulTitle(rawText, pillar, sectionLabel);
  const clean = rawText.trim();
  const rawLines = clean.split("\n").filter((l) => l.trim().length > 0);
  const strippedLines = rawLines.map(stripBullets).filter(Boolean);

  const actionVerbs = [
    "Contrôler",
    "Vérifier",
    "S'assurer de",
    "Mettre en conformité",
    "Documenter",
    "Notifier",
    "Tracer",
  ];

  const points = strippedLines.map((line, i) => {
    const upgraded = capitalizeSentences(applyLexicalUpgrades(line));
    const words = upgraded.split(/\s+/);
    if (words.length <= 4) {
      const verb = actionVerbs[i % actionVerbs.length];
      const lower = upgraded.charAt(0).toLowerCase() + upgraded.slice(1);
      return `• ${verb} : ${lower}${lower.endsWith(".") ? "" : "."}`;
    }
    return `• ${endSentence(upgraded)}`;
  });

  const pillarContext =
    pillar === "LAB_FT"
      ? "Lutte Anti-Blanchiment et Financement du Terrorisme (LCB-FT)"
      : pillar === "CONFORMITE_REGLEMENTAIRE"
      ? "Conformité Réglementaire"
      : "Gouvernance et Contrôle Interne";

  const intro = `Dans le cadre des exigences de ${pillarContext}${sectionLabel ? ` (${sectionLabel})` : ""}, les points suivants sont formalisés :`;
  const footerNote = `📌 Consigne : Veiller à la stricte application de ces points et consigner les justificatifs requis.`;

  const organizedText = `${intro}\n\n${points.join("\n")}\n\n${footerNote}`;

  const suggestedChecklist = strippedLines.map((l) => {
    const upgraded = capitalizeSentences(applyLexicalUpgrades(l));
    return endSentence(upgraded);
  });

  return {
    summaryTitle,
    organizedText,
    suggestedChecklist,
    providerUsed: "Moteur Cognitif GRC (Autonome)",
  };
}

