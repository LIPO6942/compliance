// RegulatoryInclusion story: As a compliance manager, I want the AI to automatically determine whether to include a new regulation based on predefined keywords, so I can save time and reduce the risk of missing critical updates, and review the proposed categorization to ensure accuracy.

'use server';

/**
 * @fileOverview Determines whether to include a new regulation based on predefined keywords.
 *
 * - shouldIncludeRegulation - A function that determines whether a new regulation should be included.
 * - ShouldIncludeRegulationInput - The input type for the shouldIncludeRegulation function.
 * - ShouldIncludeRegulationOutput - The return type for the shouldIncludeRegulation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ShouldIncludeRegulationInputSchema = z.object({
  regulationText: z
    .string()
    .describe('The text of the regulation to evaluate for inclusion.'),
  keywords: z
    .string()
    .describe(
      'Comma-separated list of keywords that indicate the regulation is relevant.'
    ),
});
export type ShouldIncludeRegulationInput = z.infer<
  typeof ShouldIncludeRegulationInputSchema
>;

const ShouldIncludeRegulationOutputSchema = z.object({
  include: z
    .boolean()
    .describe(
      'Whether the regulation should be included based on the keywords.'
    ),
  reason: z
    .string()
    .describe('The reason for the inclusion or exclusion decision.'),
});
export type ShouldIncludeRegulationOutput = z.infer<
  typeof ShouldIncludeRegulationOutputSchema
>;

export async function shouldIncludeRegulation(
  input: ShouldIncludeRegulationInput
): Promise<ShouldIncludeRegulationOutput> {
  return shouldIncludeRegulationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'shouldIncludeRegulationPrompt',
  input: {schema: ShouldIncludeRegulationInputSchema},
  output: {schema: ShouldIncludeRegulationOutputSchema},
  prompt: `You are a compliance expert in the financial sector.
  Your task is to determine whether a new regulation should be included based on the presence of predefined keywords.
  Respond with a boolean value indicating whether the regulation should be included and provide a brief reason for your decision.

  Regulation Text: {{{regulationText}}}
  Keywords: {{{keywords}}}

  Include:`,
});

const shouldIncludeRegulationFlow = ai.defineFlow(
  {
    name: 'shouldIncludeRegulationFlow',
    inputSchema: ShouldIncludeRegulationInputSchema,
    outputSchema: ShouldIncludeRegulationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
