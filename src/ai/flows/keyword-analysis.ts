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
    output: { schema: z.object({ analysis: z.array(z.string()).length(3).describe('A list of 3 clear points for the analysis.') }) },
    prompt: `Tu es un assistant conformité. Analyse ce texte réglementaire uniquement sous l’angle du mot-clé : "{{keyword}}".
Résume les obligations, risques potentiels, et échéances éventuelles. Présente l’analyse en 3 points clairs.
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
