'use server';

import { z } from 'zod';
import { LEGAL_KNOWLEDGE_BASE } from '../constants/knowledge-base';

const AnalyzeQuickResponseInputSchema = z.object({
  query: z.string().describe('La question ou le cas soumis par l\'utilisateur.'),
  customKnowledgeBase: z.string().optional().describe('Textes de référence actifs de la base légale.'),
});

// The output structure
const AnalyzeQuickResponseOutputSchema = z.object({
  verdict: z.string(),
  color: z.enum(['red', 'orange', 'green']),
  verbatimText: z.string().describe('Le texte légal exact entre guillemets.'),
  source: z.string().describe('La référence de l\'article ou de la loi citée.'),
  interpretation: z.string().describe('L\'explication de la règle en dehors des guillemets.'),
  steps: z.array(z.string()).describe('Etapes pratiques à suivre.'),
});
export type AnalyzeQuickResponseOutput = z.infer<typeof AnalyzeQuickResponseOutputSchema>;

export async function askQuickResponseAI(
  input: { query: string, customKnowledgeBase?: string }
): Promise<AnalyzeQuickResponseOutput | null> {
  console.log("[AI QuickResponse] Function called with query:", input.query?.substring(0, 50) + "...");
  
  try {
    const parsed = AnalyzeQuickResponseInputSchema.parse(input);
    const { query, customKnowledgeBase } = parsed;

    const baseToUse = customKnowledgeBase && customKnowledgeBase.trim() !== '' 
      ? customKnowledgeBase 
      : LEGAL_KNOWLEDGE_BASE;

    const prompt = `Tu es un expert en conformité réglementaire de très haut niveau, spécialisé en assurance et LBA/FT.
Un collaborateur de terrain te soumet le cas suivant, et a besoin d'une action immédiate :
" ${query} "

Utilise la BASE DE CONNAISSANCE FOURNIE pour répondre.
RÈGLE OBLIGATOIRE ET STRICTE : Tu dois CITER LE TEXTE DE LOI EXACT ET VERBATIM ENTRE GUILLEMETS. Toute autre interprétation, commentaire, ou action doit être en dehors des guillemets.

Réponds obligatoirement au format JSON valide suivant :
{
  "verdict": "Un mot court et percutant en MAJUSCULE (ex: REFUSER, BLOQUER, SUSPENDRE, ACCEPTER, VÉRIFIER, GEL)",
  "color": "red" (pour bloquer/refuser/geler), "orange" (pour suspendre/vérifier), ou "green" (pour accepter/règle simple),
  "verbatimText": "Citation stricte et littérale du texte légal de référence, avec les guillemets inclus (ex: \\"Les sociétés d'assurances doivent...\\").",
  "source": "Titre ou article de la loi citée",
  "interpretation": "Ton explication, contexte ou commentaire pratique (EN DEHORS DES GUILLEMETS).",
  "steps": ["Action 1 immédiate", "Action 2", "Action 3"]
}

BASE DE CONNAISSANCE DISPONIBLE :
${baseToUse}
`;

    const text = await callGroqChatCompletion(prompt);
    
    if (!text) {
      console.error("[AI QuickResponse] No text returned from Groq");
      return null;
    }

    // We expect Groq to return JSON in the output. We might need to strip markdown around it.
    const jsonStr = extractJsonFromText(text);
    if (!jsonStr) {
      console.error("[AI QuickResponse] Failed to extract JSON from text", text?.substring(0, 500) + "...");
      return null;
    }

    try {
      const data = JSON.parse(jsonStr);
      return AnalyzeQuickResponseOutputSchema.parse(data) as AnalyzeQuickResponseOutput;
    } catch (parseErr) {
      console.error("[AI QuickResponse] JSON parse or validation failed:", parseErr);
      console.error("[AI QuickResponse] Raw JSON received:", jsonStr);
      return null;
    }

  } catch (err: any) {
    console.error('[AI QuickResponse] Global flow failed:', err);
    // If it's a known error (like context length), we could return it
    return null;
  }
}

function extractJsonFromText(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    return text.slice(start, end + 1);
  }
  return null;
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
          { 
            role: 'system', 
            content: 'Tu es un assistant JSON expert en conformité. Tu réponds UNIQUEMENT et STRICTEMENT par un objet JSON.' 
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        // response_format: { type: "json_object" } // Certains modèles Groq peuvent avoir des soucis avec ce format si mal supporté
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[AI QuickResponse] Groq API error:', res.status, errorText);
      return '';
    }

    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
  } catch (err) {
    console.error('[AI QuickResponse] Groq request failed:', err);
    return '';
  }
}
