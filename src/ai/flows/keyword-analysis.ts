
'use server';

/**
 * @fileOverview Analyzes a regulatory text based on a list of keywords.
 *
 * - analyzeRegulationByKeywords - A function that analyzes a regulation for a given set of keywords.
 * - AnalyzeRegulationByKeywordsInput - The input type for the analyzeRegulationByKeywords function.
 * - AnalyzeRegulationByKeywordsOutput - The return type for the analyzeRegulationByKeywords function.
 */

import { z } from 'zod';

const AnalyzeRegulationByKeywordsInputSchema = z.object({
  regulationText: z.string().describe('The text of the regulation to evaluate.'),
  keywords: z.array(z.string()).describe('A list of keywords to analyze the text against.'),
});
export type AnalyzeRegulationByKeywordsInput = z.infer<typeof AnalyzeRegulationByKeywordsInputSchema>;

export type AnalyzeRegulationByKeywordsOutput = Record<string, string[]>;
const AnalyzeRegulationByKeywordsOutputSchema = z.record(z.string(), z.array(z.string()));


export async function analyzeRegulationByKeywords(
  input: AnalyzeRegulationByKeywordsInput
): Promise<AnalyzeRegulationByKeywordsOutput> {
  const parsed = AnalyzeRegulationByKeywordsInputSchema.parse(input);
  const { regulationText, keywords } = parsed;

  const analysisPromises = keywords.map(async (keyword: string) => {
    const prompt = buildKeywordAnalysisPrompt(regulationText, keyword);
    const text = await callGroqChatCompletion(prompt);
    const points = extractThreeBulletPoints(text);
    return { keyword, analysis: points };
  });

  const results = await Promise.all(analysisPromises);

  const analysisMap: AnalyzeRegulationByKeywordsOutput = {};
  for (const result of results) {
    if (result.analysis.length > 0) {
      analysisMap[result.keyword] = result.analysis;
    }
  }

  // Validate output shape to keep compatibility
  return AnalyzeRegulationByKeywordsOutputSchema.parse(analysisMap);
}

function buildKeywordAnalysisPrompt(regulationText: string, keyword: string): string {
  return `Tu es un expert en conformité réglementaire. Ta mission est d'analyser le texte réglementaire fourni sous l'angle spécifique du mot-clé "${keyword}".

Ton analyse doit être structurée en exactement 3 points clairs et concis :
1.  Obligations Principales : Identifie la ou les deux obligations les plus importantes directement liées au mot-clé.
2.  Risques & Impacts : Décris le principal risque de non-conformité et son impact potentiel pour l'entreprise.
3.  Recommandation / Action : Propose une action concrète et prioritaire à entreprendre pour répondre aux obligations identifiées.

Sois précis et concentre-toi uniquement sur les éléments pertinents au mot-clé.

Texte à analyser : \n\n${regulationText}`;
}

async function callGroqChatCompletion(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('[AI] Missing GROQ_API_KEY');
    return '';
  }

  const model = process.env.GROQ_MODEL || 'llama3-8b-8192';

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Tu es un assistant expert en conformité réglementaire. Réponds en français.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      console.error('[AI] Groq API error', res.status, await safeText(res));
      return '';
    }

    const data: any = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    return content ?? '';
  } catch (err) {
    console.error('[AI] Groq request failed', err);
    return '';
  }
}

async function safeText(res: any): Promise<string> {
  try { return await res.text(); } catch { return ''; }
}

function extractThreeBulletPoints(text: string): string[] {
  if (!text) return [];

  const lines = text
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Try to capture first three bullet/numbered lines
  const bullets = lines.filter((l) => /^[\-*\d]+[\.)]?\s+/.test(l)).slice(0, 3);
  if (bullets.length === 3) {
    return bullets.map((b) => b.replace(/^[\-*\d]+[\.)]?\s+/, '').trim());
  }

  // Fallback: take first three non-empty sentences
  const sentences = text
    .split(/(?<=[\.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  return sentences;
}

