"use server";

import { categorizeRegulation, type CategorizeRegulationInput, type CategorizeRegulationOutput } from "@/ai/flows/regulatory-categorization";
import { shouldIncludeRegulation, type ShouldIncludeRegulationInput, type ShouldIncludeRegulationOutput } from "@/ai/flows/regulatory-inclusion";

export interface AnalyzeRegulationResult {
  inclusion?: ShouldIncludeRegulationOutput;
  categorization?: CategorizeRegulationOutput;
  error?: string;
}

export async function analyzeRegulationAction(
  regulationText: string,
  keywords: string
): Promise<AnalyzeRegulationResult> {
  try {
    const inclusionInput: ShouldIncludeRegulationInput = { regulationText, keywords };
    const inclusionResult = await shouldIncludeRegulation(inclusionInput);

    if (inclusionResult.include) {
      const categorizationInput: CategorizeRegulationInput = { regulationText };
      const categorizationResult = await categorizeRegulation(categorizationInput);
      return { inclusion: inclusionResult, categorization: categorizationResult };
    }

    return { inclusion: inclusionResult };
  } catch (error) {
    console.error("Error in analyzeRegulationAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during AI analysis.";
    return { error: errorMessage };
  }
}
