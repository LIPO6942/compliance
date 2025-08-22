
'use server';

/**
 * @fileOverview Analyzes a regulatory text based on a list of keywords.
 *
 * - analyzeRegulationByKeywords - A function that analyzes a regulation for a given set of keywords.
 * - AnalyzeRegulationByKeywordsInput - The input type for the analyzeRegulationByKeywords function.
 * - AnalyzeRegulationByKeywordsOutput - The return type for the analyzeRegulationByKeywords function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  return analyzeRegulationByKeywordsFlow(input);
}


const keywordAnalysisPrompt = ai.definePrompt({
    name: 'keywordAnalysisPrompt',
    input: { schema: z.object({ regulationText: z.string(), keyword: z.string() }) },
    output: { schema: z.object({ analysis: z.array(z.string()).length(3).describe('Une liste de 3 points clairs pour l\'analyse.') }) },
    prompt: `Tu es un expert en conformité réglementaire. Ta mission est d'analyser le texte réglementaire fourni sous l'angle spécifique du mot-clé "{{keyword}}".

Ton analyse doit être structurée en exactement 3 points clairs et concis :
1.  **Obligations Principales :** Identifie la ou les deux obligations les plus importantes directement liées au mot-clé.
2.  **Risques & Impacts :** Décris le principal risque de non-conformité et son impact potentiel pour l'entreprise.
3.  **Recommandation / Action :** Propose une action concrète et prioritaire à entreprendre pour répondre aux obligations identifiées.

Sois précis et concentre-toi uniquement sur les éléments pertinents au mot-clé.

Texte à analyser : {{{regulationText}}}`,
});


const analyzeRegulationByKeywordsFlow = ai.defineFlow(
  {
    name: 'analyzeRegulationByKeywordsFlow',
    inputSchema: AnalyzeRegulationByKeywordsInputSchema,
    outputSchema: AnalyzeRegulationByKeywordsOutputSchema,
  },
  async ({ regulationText, keywords }) => {
    const analysisPromises = keywords.map(async (keyword) => {
        const { output } = await keywordAnalysisPrompt({ regulationText, keyword });
        return { keyword, analysis: output?.analysis ?? [] };
    });

    const results = await Promise.all(analysisPromises);
    
    const analysisMap: AnalyzeRegulationByKeywordsOutput = {};
    for (const result of results) {
        if (result.analysis.length > 0) {
            analysisMap[result.keyword] = result.analysis;
        }
    }
    
    return analysisMap;
  }
);

