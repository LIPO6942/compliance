"use server";

import { analyzeRegulationByKeywords, type AnalyzeRegulationByKeywordsInput, type AnalyzeRegulationByKeywordsOutput } from "@/ai/flows/keyword-analysis";

export interface AnalyzeRegulationResult {
  analysis?: AnalyzeRegulationByKeywordsOutput;
  error?: string;
}

export async function analyzeRegulationAction(
  regulationText: string,
  keywords: string[]
): Promise<AnalyzeRegulationResult> {
  try {
    const input: AnalyzeRegulationByKeywordsInput = { regulationText, keywords };
    const analysisResult = await analyzeRegulationByKeywords(input);
    return { analysis: analysisResult };
  } catch (error) {
    console.error("Error in analyzeRegulationAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during AI analysis.";
    return { error: errorMessage };
  }
}
