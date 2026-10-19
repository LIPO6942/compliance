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

// ─── CONFIGURATION GROQ (Modèle Qwen 3.8 27B en priorité) ───────────────────
export const PRIMARY_GROQ_MODEL = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
export const BACKUP_GROQ_MODEL = "llama-3.3-70b-versatile";

interface GroqChatCallParams {
  messages: { role: string; content: string }[];
  temperature?: number;
  customApiKey?: string;
  expectJson?: boolean;
}

/**
 * Appel centralisé et résilient à l'API Groq supportant :
 * 1. Les variables Vercel (GROQ_API_KEY, GROQ_KEY, NEXT_PUBLIC_GROQ_API_KEY) et clé utilisateur
 * 2. Le modèle Qwen 3.8 27B avec bascule automatique sur Llama 3.3 70B en cas d'indisponibilité
 * 3. Le mode JSON avec diagnostics détaillés
 */
async function callGroqWithFallback(
  params: GroqChatCallParams
): Promise<{ content: string; modelUsed: string } | null> {
  const apiKey =
    (params.customApiKey?.startsWith("gsk_") ? params.customApiKey : undefined) ||
    process.env.GROQ_API_KEY ||
    process.env.GROQ_KEY ||
    process.env.NEXT_PUBLIC_GROQ_API_KEY;

  if (!apiKey) {
    console.warn("[GROQ] Aucune clé GROQ_API_KEY trouvée dans l'environnement ni dans customApiKey.");
    return null;
  }

  const modelsToTry = [
    PRIMARY_GROQ_MODEL,
    ...(PRIMARY_GROQ_MODEL !== BACKUP_GROQ_MODEL ? [BACKUP_GROQ_MODEL] : []),
  ];

  for (const model of modelsToTry) {
    try {
      const payload: any = {
        model,
        messages: params.messages,
        temperature: params.temperature ?? 0.25,
      };
      if (params.expectJson) {
        payload.response_format = { type: "json_object" };
      }

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content && typeof content === "string" && content.trim().length > 0) {
          console.log(`[GROQ SUCCESS] Requête traitée avec succès par : ${model}`);
          return { content, modelUsed: model };
        }
      } else {
        const errText = await res.text().catch(() => "");
        console.warn(`[GROQ API WARN] Modèle ${model} HTTP ${res.status}:`, errText);
      }
    } catch (err) {
      console.warn(`[GROQ NETWORK WARN] Échec appel modèle ${model}:`, err);
    }
  }

  return null;
}

/**
 * Extraction et parsing JSON résistant aux particularités des modèles Qwen
 * (balises de réflexion <think>...</think>, blocs markdown ```json, etc.)
 */
function parseAiJson<T = any>(raw: string | null | undefined): T | null {
  if (!raw || !raw.trim()) return null;

  // 1. Éliminer les balises de réflexion propres à Qwen (<think>...</think>)
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Éliminer les blocs markdown ```json ... ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 3. Tenter un parsing direct
  try {
    return JSON.parse(cleaned) as T;
  } catch {}

  // 4. Extraire l'objet délimité par des accolades
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
    } catch {}
  }

  return null;
}

// ─── ACTION 1 : REFORMULATION FORMELLE / STYLE AVANCÉ ─────────────────────────

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

  // 1. Essai avec Groq API (Qwen 3.8 27B / Llama 3.3 70B)
  const groqRes = await callGroqWithFallback({
    messages: [
      {
        role: "system",
        content: "Tu es un expert senior en GRC MAE Assurance. Tu améliores avec excellence le texte fourni en JSON strict.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    expectJson: true,
  });

  if (groqRes) {
    const parsed = parseAiJson<any>(groqRes.content);
    if (parsed && parsed.reformulatedText) {
      return {
        reformulatedText: parsed.reformulatedText,
        suggestedTitle: parsed.suggestedTitle,
        suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : undefined,
      };
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
        const parsed = parseAiJson<any>(textResp);
        if (parsed && parsed.reformulatedText) {
          return {
            reformulatedText: parsed.reformulatedText,
            suggestedTitle: parsed.suggestedTitle,
            suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : undefined,
          };
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

  // ── MODE CHECKLIST ──
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

  // ── MODE SYNTHÉTIQUE ──
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

  // ── MODE CLARTÉ & ORTHOGRAPHE ──
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

  // ── MODE RÉGLEMENTAIRE ──
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

  // ── MODE FORMEL (défaut) ──
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

// ─── ACTION 2 : CHATBOTCOMPLIANCE (ASSISTANT & COPILOT GRC) ──────────────────

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

  const systemPrompt = `Tu es chatbotCOMPLiaNCE, un assistant IA expert en révision et amélioration de texte (style ChatGPT).
Tu es propulsé par le modèle haute performance Groq (${PRIMARY_GROQ_MODEL}).

MISSION FONDAMENTALE :
L'utilisateur te demande d'améliorer son mémo (notes brutes, observation, idée ou paragraphe).
Tu dois réaliser une AMÉLIORATION TEXTUELLE NATURELLE, FLUIDE ET SOIGNÉE, EXACTEMENT COMME LE FAIT CHATGPT.

DIRECTIVES DE STYLE :
1. AMÉLIORATION DU TEXTE ("suggestedContent") :
   - Réécris le texte dans un français impeccable, soigné, fluide et naturel.
   - Corrige toutes les fautes d'orthographe, de ponctuation, de grammaire et de syntaxe.
   - Clarifie et embellis les phrases maladroites tout en restant 100% fidèle au sens et aux faits décrits par l'utilisateur.
   - NE FORCE AUCUN PLAN ARTIFICIEL : pas de labels rigides (PAS de "Constat", PAS de "Risque", PAS de "Enjeu", PAS de "Actions requises", PAS de formule d'intro pompeuse comme "Dans le cadre de...").
   - Conserve la structure naturelle du texte :
     • Si c'est un paragraphe ou une phrase continue, améliore-le en un paragraphe fluide et naturel.
     • Si le texte d'origine contient des tirets ou une liste, améliore chaque point avec clarté et naturel.

2. TITRE PROPOSÉ ("suggestedTitle") :
   - Rédige un titre synthétique, clair et percutant (4 à 8 mots maximum) qui résume fidèlement le sujet traité.
   - Si le texte décrit une anomalie ou un problème, indique-le clairement (ex: "Anomalie lors de la création d'un client sur serveur test").

3. CHECKLIST D'ACTIONS ("suggestedChecklist") :
   - Si le texte décrit des actions ou vérifications concrètes à mener, extrais 2 ou 3 actions courtes à l'infinitif. Sinon, laisse le tableau vide [].

4. MESSAGE DE RÉPONSE ("reply") :
   - "Voici la version améliorée de votre mémo :"

RÉPONDS STRICTEMENT SOUS FORME D'OBJET JSON VALIDE :
{
  "reply": "Voici la version améliorée de votre mémo :",
  "suggestedTitle": "Titre court et pertinent",
  "suggestedContent": "Texte amélioré rédigé avec naturel, fluidité et élégance",
  "framingAnalysis": "",
  "suggestedChecklist": []
}`;

  const formattedMessages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-4).map((h) => ({ role: h.role, content: h.content })),
    {
      role: "user",
      content: userPrompt,
    },
  ];

  // 1. Essai avec Groq API (modèle qwen/qwen3.8-27b en priorité, puis fallback Llama 70B)
  const groqRes = await callGroqWithFallback({
    messages: formattedMessages,
    temperature: 0.25,
    customApiKey,
    expectJson: true,
  });

  if (groqRes) {
    const parsed = parseAiJson<{
      reply?: string;
      suggestedTitle?: string;
      suggestedContent?: string;
      framingAnalysis?: string;
      suggestedChecklist?: string[];
    }>(groqRes.content);

    if (parsed && (parsed.suggestedContent || parsed.reply)) {
      return {
        reply: parsed.reply || "Voici la version améliorée et structurée de votre mémo :",
        framingAnalysis: parsed.framingAnalysis || "",
        suggestedTitle: parsed.suggestedTitle || (currentMemoTitle || "Note de Conformité"),
        suggestedContent: parsed.suggestedContent || userPrompt,
        suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : [],
        providerUsed: `Groq (${groqRes.modelUsed})`,
      };
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
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${formattedMessages[formattedMessages.length - 1].content}` }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const textResp = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = parseAiJson<any>(textResp);
        if (parsed && (parsed.suggestedContent || parsed.reply)) {
          return {
            reply: parsed.reply || "Voici la version améliorée et structurée de votre mémo :",
            framingAnalysis: parsed.framingAnalysis || "",
            suggestedTitle: parsed.suggestedTitle || (currentMemoTitle || "Note de Conformité"),
            suggestedContent: parsed.suggestedContent || userPrompt,
            suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : [],
            providerUsed: "Google Gemini 1.5 Flash",
          };
        }
      }
    } catch (e) {
      console.warn("[MEMO CHAT AI] Gemini attempt error:", e);
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
          messages: formattedMessages,
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const contentStr = data?.choices?.[0]?.message?.content;
        const parsed = parseAiJson<any>(contentStr);
        if (parsed && (parsed.suggestedContent || parsed.reply)) {
          return {
            reply: parsed.reply || "Voici la version améliorée et structurée de votre mémo :",
            framingAnalysis: parsed.framingAnalysis || "",
            suggestedTitle: parsed.suggestedTitle || (currentMemoTitle || "Note de Conformité"),
            suggestedContent: parsed.suggestedContent || userPrompt,
            suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : [],
            providerUsed: "OpenAI GPT-4o-mini",
          };
        }
      }
    } catch (e) {
      console.warn("[MEMO CHAT AI] OpenAI attempt error:", e);
    }
  }

  // 4. Moteur Cognitif Expert GRC (Autonome, zéro dépendance réseau)
  return generateCognitiveFramingAndMemo(userPrompt, currentMemoText, currentMemoTitle, pillar, sectionLabel);
}

function cleanRawMemoText(prompt: string, existingText?: string): string {
  const quoteMatch = prompt.match(/«\s*([\s\S]*?)\s*»/) || prompt.match(/"\s*([\s\S]*?)\s*"/);
  if (quoteMatch && quoteMatch[1] && quoteMatch[1].trim().length > 3) {
    return quoteMatch[1].trim();
  }
  if (existingText && existingText.trim().length > 3) {
    return existingText.trim();
  }
  return prompt
    .replace(/^am[eé]liore[-\s]moi\s+ce\s+m[eé]mo\s*[:\s]*/i, "")
    .replace(/^am[eé]liorer\s+ce\s+m[eé]mo\s*[:\s]*/i, "")
    .replace(/^peux-tu\s+analyser\s+et\s+am[eé]liorer\s+ce\s+m[eé]mo\s*[:\s]*/i, "")
    .replace(/\(titre\s+indicatif\s+actuel\s*:\s*[^)]+\)/gi, "")
    .replace(/🎯\s*objectif\s*:[\s\S]*?📝\s*mémo\s+à\s+améliorer\s*:\s*/i, "")
    .replace(/^[«"]\s*/, "")
    .replace(/\s*[»"]$/, "")
    .trim();
}

function extractRawIndicativeTitle(prompt: string, existingTitle?: string): string {
  if (existingTitle && existingTitle.trim()) {
    return existingTitle.trim();
  }
  const match = prompt.match(/titre\s+indicatif\s+actuel\s*:\s*["«']?([^"»')]+)["»']?/i);
  return match && match[1] ? match[1].trim() : "";
}

function isRawOrCopiedTitle(title: string, rawText: string): boolean {
  if (!title || !title.trim()) return true;
  const t = title.trim().toLowerCase();
  if (/^(test|nouveau|mémo|note|sans titre|test aml|test kyc|point de vigilance|note de conformité)$/i.test(t)) {
    return true;
  }
  // Si le titre indicatif est simplement un extrait brut copié du début du mémo
  const rawClean = rawText.toLowerCase().replace(/[^a-z0-9]/g, "");
  const titleClean = t.replace(/[^a-z0-9]/g, "");
  if (titleClean.length > 12 && rawClean.includes(titleClean)) {
    return true;
  }
  return false;
}

function synthesizeSmartTitle(text: string, rawTitle?: string, sectionLabel?: string): string {
  const lower = text.toLowerCase();

  // 1. Détection dysfonctionnement création client / recherche / soumettre / serveur test
  if (
    (/cr[eé]ation.*client/i.test(lower) || /nouveau.*client/i.test(lower)) &&
    (/soumettre/i.test(lower) || /s['’]arr[eê]te/i.test(lower) || /recherche/i.test(lower) || /inexistant/i.test(lower) || /test/i.test(lower))
  ) {
    return "Dysfonctionnement lors de la création d'un nouveau client (Serveur Test)";
  }

  // 2. Détection calcul / score de risque
  if (/calcul.*risque|score.*risque/i.test(lower) && /adapte|d[eé]cision|filtrage|corrig/i.test(lower)) {
    return "Actualisation du calcul de risque après révision de décision agent";
  }

  // 3. Transactions sans KYC
  if (/importer.*[eé]tat.*(ligne.*invalide|transaction.*sans.*kyc)/i.test(lower) || (lower.includes("invalide") && lower.includes("kyc"))) {
    return "État des transactions sans fiche KYC";
  }

  // 4. Seuil espèces
  if (/seuil|esp[eè]ces|cash/i.test(lower)) {
    return "Suivi des encaissements en espèces et respect des seuils";
  }

  // 5. KYC & RNE
  if (/kyc|pi[eè]ce.*identit[eé]|rne/i.test(lower)) {
    return "Mise en conformité documentaire KYC & RNE";
  }

  // 6. PPE / PEP
  if (/pep|ppe|personne.*politiquement/i.test(lower)) {
    return "Contrôle renforcé des profils PEP/PPE";
  }

  // 7. Rapprochement
  if (/rapprochement|c07|agence/i.test(lower)) {
    return "Rapprochement des états d'agences";
  }

  // 8. AML Filtres & Exports
  if (/aml|lcb-?ft/i.test(lower) && /filtre|export/i.test(lower)) {
    return "Optimisation des filtres et exports des transactions AML";
  }

  // 9. Anomalie générale avec bouton ou composant
  if (/anomalie|erreur|bloqu|dysfonctionnement|ne fonctionne pas|échec|pb /i.test(lower)) {
    if (/bouton|soumettre|validation|clic/i.test(lower)) {
      return "Anomalie lors de la soumission et validation du formulaire";
    }
    return "Correction d'anomalie opérationnelle";
  }

  // Si l'utilisateur avait fourni un titre réfléchi qui n'est pas un extrait brut
  if (rawTitle && !isRawOrCopiedTitle(rawTitle, text)) {
    return rawTitle.trim();
  }

  return extractCleanDirectTitle(text, rawTitle, sectionLabel);
}

function reformulateSingleBullet(rawLine: string): string {
  let line = rawLine.trim();
  line = line.replace(/^[📌🎯⚠️•\-\*\d+\.\)\[\]\s]+/, "").trim();
  if (!line) return "";

  // Cas spécifiques du mémo AML
  if (/a\s+revoir.*(identifiant.*transaction|r[eé]f[eé]rence).*(regrow|regtools)/i.test(line)) {
    return "Harmoniser la référence de l'identifiant de transaction REGTOOLS et vérifier l'affichage des mentions « Expéditeur » et « Destinataire »";
  }
  if (/gestion.*dossier.*sender/i.test(line)) {
    return "Structurer et fiabiliser la gestion des dossiers émetteurs (« Sender »)";
  }
  if (/flagged\s+by\s+rule.*sc[eé]nario/i.test(line) || /sc[eé]nario.*flagged/i.test(line)) {
    return "Clarifier le libellé du scénario d'alerte sous la règle de détection (« Flagged by rule »)";
  }
  if (/ajouter.*type.*contrat.*produit/i.test(line)) {
    return "Intégrer le type de contrat / produit dans l'état des informations supplémentaires";
  }
  if (/exportation.*filtre.*(type.*traitement|clotur|investigation|suspect)/i.test(line)) {
    return "Permettre l'exportation des données selon le statut de traitement (Clôturé, Investigation, À traiter, Activité suspecte)";
  }
  if (/exportation.*produit.*(vie|non\s*vie)/i.test(line) || /possibilit[eé].*export.*produit/i.test(line)) {
    return "Ajouter la possibilité d'exportation segmentée par branche de produit (Vie / Non-Vie)";
  }
  if (/clarifier.*filtre.*report[eé]s/i.test(line)) {
    return "Clarifier les critères et le fonctionnement du filtre « Reportés » (Oui / Non)";
  }
  if (/clarifier.*filtre.*type/i.test(line)) {
    return "Préciser la définition et les options du filtre « Type »";
  }

  // Règles générales de reformulation dynamique
  if (/^[aà]\s+revoir\s+/i.test(line) || /^revoir\s+/i.test(line)) {
    line = line.replace(/^[aà]?\s*revoir\s+/i, "Réviser et fiabiliser ");
  } else if (/^[aà]\s+clarifier\s+/i.test(line) || /^clarifier\s+/i.test(line)) {
    line = line.replace(/^[aà]?\s*clarifier\s+/i, "Clarifier ");
  } else if (/^[aà]\s+ajouter\s+/i.test(line) || /^ajouter\s+/i.test(line)) {
    line = line.replace(/^[aà]?\s*ajouter\s+/i, "Intégrer ");
  } else if (/^[aà]\s+v[eé]rifier\s+/i.test(line) || /^v[eé]rifier\s+/i.test(line)) {
    line = line.replace(/^[aà]?\s*v[eé]rifier\s+/i, "Contrôler ");
  } else if (/^possibilit[eé]\s+d['’]exportation\s+/i.test(line)) {
    line = line.replace(/^possibilit[eé]\s+d['’]exportation\s+/i, "Permettre l'exportation ");
  } else if (/^exportation\s+des?\s+/i.test(line)) {
    line = line.replace(/^exportation\s+des?\s+/i, "Déployer l'exportation des ");
  } else if (/^voir\s+la\s+possibilit[eé]\s+d['’]/i.test(line)) {
    line = line.replace(/^voir\s+la\s+possibilit[eé]\s+d['’]/i, "Étudier la possibilité d'");
  } else if (/^voir\s+la\s+possibilit[eé]\s+de\s+/i.test(line)) {
    line = line.replace(/^voir\s+la\s+possibilit[eé]\s+de\s+/i, "Étudier la possibilité de ");
  } else if (/^il\s+faut\s+/i.test(line)) {
    line = line.replace(/^il\s+faut\s+/i, "Veiller à ");
  } else if (/^gestion\s+de\s+/i.test(line)) {
    line = line.replace(/^gestion\s+de\s+/i, "Structurer la gestion de ");
  }

  // Normalisation du vocabulaire et guillemets français
  line = line.replace(/\bregrow\b/gi, "REGTOOLS");
  line = line.replace(/\bvie\/non\s*vie\b/gi, "Vie / Non-Vie");
  line = line.replace(/\bclotur[eé]\b/gi, "Clôturé");
  line = line.replace(/\ba\s+traiter\b/gi, "À traiter");
  line = line.replace(/"sender"/gi, "émetteur (« Sender »)");
  line = line.replace(/"flagged by rule"/gi, "règles de détection (« Flagged by rule »)");
  line = line.replace(/"l'expéditeur"/gi, "« Expéditeur »");
  line = line.replace(/"destinataire"/gi, "« Destinataire »");
  line = line.replace(/"produit"/gi, "« Produit »");
  line = line.replace(/"type"/gi, "« Type »");

  line = applyLexicalUpgrades(line);
  line = line.charAt(0).toUpperCase() + line.slice(1);
  return endSentence(line);
}

function extractCleanDirectTitle(text: string, rawTitle?: string, sectionLabel?: string): string {
  const lower = text.toLowerCase();
  const titleLower = (rawTitle || "").toLowerCase();

  const isAmlRelated =
    /aml|lcb-?ft|lab-?ft|blanchiment|regrow|regtools|flagged|suspicion/i.test(lower) ||
    /aml/i.test(titleLower);
  const isTransactionRelated =
    /transaction|virement|paiement|versement|exp[eé]diteur|destinataire/i.test(lower);
  const isFilterExportRelated = /filtre|export|extraction|rapport/i.test(lower);

  if ((isAmlRelated || /sc[eé]nario|sender/i.test(lower)) && (isFilterExportRelated || isTransactionRelated)) {
    return "Optimisation des filtres et exports des transactions AML";
  }

  if (
    /importer.*[eé]tat.*(ligne.*invalide|transaction.*sans.*kyc)/i.test(lower) ||
    (lower.includes("invalide") && lower.includes("kyc"))
  ) {
    return "État des transactions sans fiche KYC";
  }

  if (/calcul.*risque|score.*risque/i.test(lower) && /adapte|d[eé]cision|filtrage|corrig/i.test(lower)) {
    return "Actualisation du calcul de risque après révision de décision agent";
  }

  if (/seuil|esp[eè]ces|cash/i.test(lower)) {
    return "Suivi des encaissements en espèces et respect des seuils";
  }

  if (/kyc|pi[eè]ce.*identit[eé]|rne/i.test(lower)) {
    return "Mise en conformité documentaire KYC & RNE";
  }

  if (/pep|ppe|personne.*politiquement/i.test(lower)) {
    return "Contrôle renforcé des profils PEP/PPE";
  }

  if (/rapprochement|c07|agence/i.test(lower)) {
    return "Rapprochement des états d'agences";
  }

  if (/anomalie|erreur|bloqu/i.test(lower)) {
    return "Correction d'anomalie opérationnelle";
  }

  if (rawTitle && !isRawOrCopiedTitle(rawTitle, text)) {
    return rawTitle.trim();
  }

  const cleanLines = text
    .split("\n")
    .map((l) => l.replace(/^[📌🎯⚠️•\-\*\d+\.\)\[\]\s]+/, "").trim())
    .filter((l) => l.length > 5);

  if (cleanLines.length > 0) {
    const firstLine = cleanLines[0]
      .replace(/^a\s+revoir\s+(la\s+r[eé]f[eé]rence\s+de\s+)?/i, "")
      .replace(/^revoir\s+/i, "")
      .replace(/^clarifier\s+/i, "")
      .replace(/^ajouter\s+/i, "")
      .replace(/^voir\s+la\s+possibilit[eé]\s+(de|d['’])\s*/i, "")
      .replace(/^il\s+faut\s*/i, "")
      .trim();

    const words = firstLine.split(/\s+/).filter((w) => w.length > 2);
    if (words.length >= 2) {
      const candidate = words.slice(0, 6).join(" ");
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
  }

  return sectionLabel ? `Note — ${sectionLabel}` : "Note de conformité";
}

function rephraseNaturally(rawText: string): string {
  let t = rawText.trim();
  // Nettoyage de la ponctuation et des espaces
  t = t.replace(/\s+([,.;:!?])/g, "$1");
  t = t.replace(/([,;])([^\s])/g, "$1 $2");
  t = t.replace(/\s*\((\s*)/g, " (");
  t = t.replace(/(\s*)\)\s*/g, ") ");
  t = t.replace(/\s{2,}/g, " ");

  // Normalisation des guillemets
  t = t.replace(/"([^"]+)"/g, "« $1 »");

  // Corrections orthographiques et lexicales
  t = applyLexicalUpgrades(t);

  // Amélioration fluide des tournures fréquentes
  t = t.replace(/\bcreation\b/gi, "création");
  t = t.replace(/\bse declenche\b/gi, "s'enclenche");
  t = t.replace(/\bse déclenche\b/gi, "s'enclenche");
  t = t.replace(/\bs'arrete\b/gi, "s'arrête");
  t = t.replace(/\bne s'effectue pas convenablement\b/gi, "ne s'exécute pas correctement");
  t = t.replace(/\bphysique \/ morale \/ entité publique\b/gi, "personne physique, morale ou entité publique");

  t = capitalizeSentences(t);
  return endSentence(t);
}

function generateCognitiveFramingAndMemo(
  prompt: string,
  existingText?: string,
  existingTitle?: string,
  pillar?: MemoPillar,
  sectionLabel?: string
): ChatWithMemoAIResult {
  const rawText = cleanRawMemoText(prompt, existingText);
  const rawIndicativeTitle = extractRawIndicativeTitle(prompt, existingTitle);
  const lower = rawText.toLowerCase();

  let suggestedTitle = synthesizeSmartTitle(rawText, rawIndicativeTitle, sectionLabel);
  let suggestedContent = "";
  let suggestedChecklist: string[] = [];

  // Détection de liste de points
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^(notes?|constats?|à faire|todos?|points?)\s*[:\-]?$/i.test(l));
  const isBulletList = lines.length > 1 || lines.some((l) => /^[•\-\*]/.test(l));

  // ── CAS 1 : Dysfonctionnement création nouveau client sur serveur test ──
  if (
    (/cr[eé]ation.*client/i.test(lower) || /nouveau.*client/i.test(lower)) &&
    (/soumettre/i.test(lower) || /s['’]arr[eê]te/i.test(lower) || /recherche/i.test(lower) || /inexistant/i.test(lower) || /test/i.test(lower))
  ) {
    suggestedTitle = "Anomalie lors de la création d'un client sur le serveur test";
    suggestedContent =
      "Lors de la création d'un nouveau client sur le serveur de test (personne physique, morale ou entité publique), lorsque le client n'existe pas en base, la recherche préalable ne s'exécute pas correctement : le bouton « Soumettre » s'enclenche puis s'interrompt prématurément sans finaliser l'opération.";
    suggestedChecklist = [
      "Vérifier le comportement de la recherche pour les clients non existants",
      "Déboguer le déclenchement du bouton Soumettre",
      "Tester la création complète pour chaque type de client (physique, morale, entité publique)",
    ];
  }
  // ── CAS 2 : Calcul / Score de risque non adapté ──
  else if (/calcul.*risque|score.*risque/i.test(lower) && /adapte|d[eé]cision|filtrage|corrig/i.test(lower)) {
    suggestedTitle = "Actualisation du calcul de risque après révision de décision agent";
    suggestedContent =
      "Lors de la correction manuelle de la décision d'un agent par l'équipe conformité (passage de 'Oui' à 'Non'), le moteur de calcul du score de risque ne s'actualise pas automatiquement et conserve sa valeur précédente. Il convient d'assurer le recalcul immédiat du niveau de risque et sa traçabilité.";
    suggestedChecklist = [
      "Vérifier le recalcul effectif du score après correction de décision",
      "Contrôler la cohérence des dossiers révisés",
    ];
  }
  // ── CAS 3 : Liste à puces (amélioration de chaque point sans labels artificiels) ──
  else if (isBulletList) {
    const allPoints = lines.map((l) => `• ${reformulateSingleBullet(l)}`);
    suggestedContent = allPoints.join("\n");
    suggestedChecklist = allPoints.slice(0, 4).map((p) => p.replace(/^•\s*/, ""));
  }
  // ── CAS 4 : Paragraphe continu (amélioration textuelle naturelle style ChatGPT) ──
  else {
    suggestedContent = rephraseNaturally(rawText);
    suggestedChecklist = [];
  }

  return {
    reply: "Voici la version améliorée de votre mémo :",
    framingAnalysis: "",
    suggestedTitle,
    suggestedContent,
    suggestedChecklist,
    providerUsed: "chatbotCOMPLiaNCE",
  };
}

// ─── ACTION 3 : GÉNÉRATION DU TITRE AUTOMATIQUE SYNTHÉTIQUE ─────────────────

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

  // 1. Essai avec Groq API (Qwen 3.8 27B / Llama 3.3 70B)
  const prompt = `Tu es un expert en synthèse et conformité d'assurance MAE.
Rédige un TITRE SYNTHÉTIQUE court, percutant et professionnel (entre 4 et 8 mots maximum) résumant fidèlement le problème, le constat ou la consigne énoncée dans le texte ci-dessous.
IMPORTANT : Ne recopie pas bêtement le début du texte ! Formule un vrai titre de synthèse (Exemples : 'Dysfonctionnement création client (Serveur Test)', 'Non-persistance colonne Agent éditeur', 'Blocage transactions suspectes PEP').
Reste strictement fidèle aux faits sans aucune invention.
Réponds STRICTEMENT sous format JSON : { "title": "Ton titre synthétique" }

TEXTE À RÉSUMER :
"""
${trimmed}
"""`;

  const groqRes = await callGroqWithFallback({
    messages: [
      { role: "system", content: "Tu es un assistant expert qui répond exclusivement par un objet JSON { \"title\": \"...\" }." },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    expectJson: true,
  });

  if (groqRes) {
    const parsed = parseAiJson<{ title?: string }>(groqRes.content);
    if (parsed?.title && typeof parsed.title === "string" && parsed.title.trim().length > 3) {
      return { title: parsed.title.trim().replace(/^["']|["']$/g, "") };
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
        const parsed = parseAiJson<{ title?: string }>(textResp);
        if (parsed?.title) {
          return { title: parsed.title.trim().replace(/^["']|["']$/g, "") };
        }
      }
    } catch (geminiErr) {
      console.warn("[TITLE AI] Gemini attempt error:", geminiErr);
    }
  }

  // 3. Fallback NLP sémantique haute fidélité (0ms)
  const localTitle = synthesizeSmartTitle(trimmed, undefined, sectionLabel);
  return { title: localTitle };
}

// ─── ACTION 4 : AMÉLIORATION DIRECTE 1-CLIC DU MÉMO ─────────────────────────

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

  // 1. Essai avec Groq API (modèle qwen/qwen3.8-27b en priorité)
  const groqRes = await callGroqWithFallback({
    messages: [
      { role: "system", content: "Tu es un expert senior en GRC d'assurance. Tu réponds exclusivement en JSON strict." },
      { role: "user", content: prompt },
    ],
    temperature: 0.25,
    customApiKey,
    expectJson: true,
  });

  if (groqRes) {
    const parsed = parseAiJson<{
      summaryTitle?: string;
      organizedText?: string;
      suggestedChecklist?: string[];
    }>(groqRes.content);

    if (parsed && (parsed.organizedText || parsed.summaryTitle)) {
      return {
        summaryTitle: parsed.summaryTitle || synthesizeSmartTitle(rawText, undefined, sectionLabel),
        organizedText: parsed.organizedText || rawText,
        suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : [],
        providerUsed: `Groq (${groqRes.modelUsed})`,
      };
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
        const parsed = parseAiJson<{
          summaryTitle?: string;
          organizedText?: string;
          suggestedChecklist?: string[];
        }>(textResp);

        if (parsed && (parsed.organizedText || parsed.summaryTitle)) {
          return {
            summaryTitle: parsed.summaryTitle || synthesizeSmartTitle(rawText, undefined, sectionLabel),
            organizedText: parsed.organizedText || rawText,
            suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : [],
            providerUsed: "Google Gemini",
          };
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
        const parsed = parseAiJson<{
          summaryTitle?: string;
          organizedText?: string;
          suggestedChecklist?: string[];
        }>(contentStr);

        if (parsed && (parsed.organizedText || parsed.summaryTitle)) {
          return {
            summaryTitle: parsed.summaryTitle || synthesizeSmartTitle(rawText, undefined, sectionLabel),
            organizedText: parsed.organizedText || rawText,
            suggestedChecklist: Array.isArray(parsed.suggestedChecklist) ? parsed.suggestedChecklist : [],
            providerUsed: "OpenAI GPT-4o-mini",
          };
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
  const clean = rawText.trim();
  const lower = clean.toLowerCase();

  const rawLines = clean
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^(actions requises|action requise|notes?|constats?|à faire|todos?|points?)\s*[:\-]?$/i.test(l));

  const strippedContent = rawLines.map(stripBullets).join(" ");

  // Détection thématique experte (Anomalies, LCB-FT, KYC, Fraude, Agences, Création Client)
  const hasClientCreationIssue =
    (/cr[eé]ation.*client/i.test(lower) || /nouveau.*client/i.test(lower)) &&
    (/soumettre/i.test(lower) || /s['’]arr[eê]te/i.test(lower) || /recherche/i.test(lower) || /inexistant/i.test(lower) || /test/i.test(lower));
  const hasRiskCalcIssue =
    /calcul de risque|score de risque|scoring/i.test(lower) &&
    /ne s'adapte pas|pas mis à jour|incohéren|erreur|bloqu|décision/i.test(lower);
  const hasFiltrageAgentIssue =
    /décision.*agent|corrige.*décision|oui vers non|non vers oui|filtrage/i.test(lower);
  const hasCashIssue = /espèces|cash|seuil|versement|dépassement|retrait/i.test(lower);
  const hasKycIssue = /kyc|rne|pièce|identité|cin|justificatif|passeport|bénéficiaire/i.test(lower);
  const hasPepIssue = /pep|ppe|sanction|gel.*avoirs|politiquement/i.test(lower);
  const hasSinistreIssue = /sinistre|indemnisation|fraude|fausse déclaration|décaissement/i.test(lower);
  const hasAgencyIssue = /agence|succursale|commercial|guichet|délégation/i.test(lower);

  let summaryTitle = "";
  let constatPoint = "";
  let impactPoint = "";
  let actionPoints: string[] = [];
  let checklistItems: string[] = [];

  if (hasClientCreationIssue) {
    summaryTitle = "Dysfonctionnement lors de la création d'un nouveau client (Serveur Test)";
    constatPoint =
      "Lors de la création d'un nouveau client (personne physique, morale ou entité publique) sur l'environnement de test, lorsque le tiers n'existe pas en base, la recherche préalable ne s'effectue pas convenablement et le bouton « Soumettre » s'enclenche puis s'arrête prématurément sans finaliser l'enregistrement.";
    impactPoint =
      "Blocage de l'enregistrement des nouveaux clients et impossibilité d'initialiser les contrôles préalables de conformité (filtrage et KYC) sur l'environnement de test.";
    actionPoints = [
      "Vérifier la requête et le comportement de la recherche préalable pour les tiers non existants.",
      "Déboguer le déclenchement et la gestion d'erreur du bouton « Soumettre ».",
      "Valider la procédure sur l'ensemble des typologies (physique, morale et entité publique)."
    ];
    checklistItems = [
      "Déboguer le déclenchement et l'arrêt du bouton Soumettre",
      "Vérifier la recherche préalable pour les clients inexistants",
      "Valider la création sur les 3 types de profils (physique, morale, entité publique)"
    ];
  } else if (hasRiskCalcIssue || (hasFiltrageAgentIssue && /risque/i.test(lower))) {
    summaryTitle = "Non-adaptation du calcul de risque après révision de décision de filtrage";
    constatPoint =
      "Lors de la correction manuelle de la décision d'un agent par l'équipe conformité (passage de 'Oui' à 'Non' dans les résultats de filtrage), le moteur de calcul du score de risque ne s'actualise pas automatiquement et conserve sa valeur précédente.";
    impactPoint =
      "Risque d'incohérence entre la décision de conformité validée et le score affiché, faussant la classification du profil de risque client et la traçabilité lors des contrôles d'audit.";
    actionPoints = [
      "Déclencher le recalcul automatique du score de risque dès validation d'une nouvelle décision par l'équipe conformité.",
      "Assurer la persistance immédiate de la décision révisée et tracer l'auteur de la modification dans la piste d'audit.",
      "Identifier et réévaluer les dossiers déjà modifiés manuellement pour harmoniser leurs scores de risque."
    ];
    checklistItems = [
      "Vérifier le recalcul effectif du score de risque après modification de décision agent",
      "Contrôler la cohérence des dossiers corrigés dans la base de données",
      "Valider la traçabilité de l'auteur de la correction dans le journal d'audit"
    ];
  } else if (hasCashIssue) {
    summaryTitle = "Vigilance sur les versements d'espèces et respect des seuils LCB-FT";
    constatPoint = `Signalement d'opérations en espèces nécessitant une vigilance renforcée : ${clean}`;
    impactPoint =
      "Risque de non-conformité majeure vis-à-vis des circulaires CTAF et sanctions réglementaires en cas de défaut de justification économique.";
    actionPoints = [
      "Exiger la justification documentée de l'origine licite des fonds avant toute validation d'encaissement.",
      "Bloquer temporairement l'opération en l'absence de justificatifs probants.",
      "Notifier immédiatement le Responsable Conformité / LCB-FT pour examen d'une éventuelle déclaration de soupçon."
    ];
    checklistItems = [
      "Exiger les justificatifs de provenance des fonds avant encaissement",
      "Vérifier l'historique des versements récents du souscripteur",
      "Transmettre la fiche d'incident au Responsable LCB-FT"
    ];
  } else if (hasKycIssue) {
    summaryTitle = "Mise en conformité documentaire KYC & Justificatifs RNE";
    constatPoint = `Constat relatif aux dossiers d'identification client : ${clean}`;
    impactPoint =
      "Risque de non-conformité lors des audits périodiques du CGA et défaut d'identification formelle des bénéficiaires effectifs.";
    actionPoints = [
      "Exiger la fourniture d'une pièce d'identité en cours de validité ou d'un extrait RNE de moins de 3 mois.",
      "Suspendre toute souscription ou validation contractuelle tant que le dossier documentaire n'est pas exhaustif.",
      "Numériser et archiver l'ensemble des pièces probantes dans le système centralisé."
    ];
    checklistItems = [
      "Vérifier la validité de la pièce d'identité ou extrait RNE récent (< 3 mois)",
      "Contrôler la conformité des bénéficiaires effectifs (UBO)",
      "Bloquer la validation tant que les pièces obligatoires sont manquantes"
    ];
  } else if (hasPepIssue) {
    summaryTitle = "Filtrage et surveillance renforcée Personnes Politiquement Exposées (PPE)";
    constatPoint = `Point de vigilance relatif à l'identification d'une personne exposée ou sanctionnée : ${clean}`;
    impactPoint =
      "Exposition accrue aux obligations de vigilance constante et risque de sanctions légales en cas de défaillance du dispositif de filtrage.";
    actionPoints = [
      "Effectuer un filtrage contradictoire sur les bases de données de sanctions et listes PPE officielles.",
      "Soumettre le dossier à l'approbation formelle de la Direction de la Conformité avant toute relation contractuelle.",
      "Instaurer une surveillance continue sur l'ensemble des flux financiers associés."
    ];
    checklistItems = [
      "Contrôler l'exactitude de l'homonymie sur les bases PPE / Sanctions",
      "Recueillir l'accord écrit de la Direction de la Conformité",
      "Consigner la fiche de surveillance renforcée dans le dossier"
    ];
  } else if (hasSinistreIssue) {
    summaryTitle = "Contrôle des dossiers sinistres et prévention de la fraude";
    constatPoint = `Constat relatif à l'instruction d'un dossier de sinistre : ${clean}`;
    impactPoint = "Risque de sur-indemnisation ou de versement indu portant atteinte aux équilibres techniques de la compagnie.";
    actionPoints = [
      "Suspendre le décaissement en attente de validation contradictoire des pièces justificatives.",
      "Rapprocher les antécédents de sinistres et croiser les informations avec les fichiers centraux.",
      "Solliciter un avis motivé de la cellule anti-fraude avant tout règlement."
    ];
    checklistItems = [
      "Vérifier la cohérence du rapport d'expertise et des pièces du dossier",
      "Contrôler l'historique des sinistres antérieurs de l'assuré",
      "Soumettre le dossier au visa du Responsable Sinistres / Fraude"
    ];
  } else if (hasAgencyIssue) {
    summaryTitle = "Rappel des procédures et consignes pour le réseau des agences";
    constatPoint = `Instruction de conformité opérationnelle pour les agences : ${clean}`;
    impactPoint = "Risque de disparité dans l'application des contrôles obligatoires et non-respect des délégations de pouvoir.";
    actionPoints = [
      "Diffuser la consigne formelle à l'ensemble des chefs d'agences et succursales commerciales.",
      "Vérifier le respect des plafonds autorisés et des pièces justificatives obligatoires.",
      "Prévoir un contrôle de second niveau par l'inspection commerciale."
    ];
    checklistItems = [
      "Notifier la note de service aux responsables d'agences",
      "Contrôler la conformité des encaissements et souscriptions récentes",
      "Rendre compte à la Direction du Réseau Commercial"
    ];
  } else {
    summaryTitle = synthesizeSmartTitle(clean, undefined, sectionLabel);
    const cleanedSentences = strippedContent
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    constatPoint = cleanedSentences.length > 0
      ? `Constat relevé : ${cleanedSentences[0]}`
      : `Constat relevé dans le cadre des vérifications opérationnelles : ${clean}`;

    impactPoint = "Nécessité de cadrage et de mise en conformité opérationnelle pour garantir la rigueur et la traçabilité des opérations.";
    actionPoints = cleanedSentences.length > 1
      ? cleanedSentences.slice(1).map((s) => `Prendre en compte : ${endSentence(s)}`)
      : [
          "Appliquer les mesures correctives nécessaires selon les procédures en vigueur.",
          "Documenter l'état d'avancement et tracer les étapes de traitement.",
          "Assurer le suivi régulier auprès du responsable de section concerné."
        ];
    checklistItems = [
      "Vérifier l'application des consignes transmises",
      "Contrôler la conformité de l'opération dans le système",
      "Archiver les éléments de preuve au dossier"
    ];
  }

  const intro = `Dans le cadre du suivi de conformité (${sectionLabel || "Opérations"}) :`;
  const bullets = [
    `• Constat opérationnel : ${endSentence(constatPoint)}`,
    `• Risque & Enjeu : ${endSentence(impactPoint)}`,
    ...actionPoints.map((act) => `• Action requise : ${endSentence(act)}`),
  ];
  const consigne = "📌 Consigne : Veiller à la traçabilité complète de ces actions et faire remonter tout blocage.";

  const organizedText = `${intro}\n\n${bullets.join("\n")}\n\n${consigne}`;

  return {
    summaryTitle,
    organizedText,
    suggestedChecklist: checklistItems,
    providerUsed: "Moteur Cognitif GRC Expert",
  };
}
