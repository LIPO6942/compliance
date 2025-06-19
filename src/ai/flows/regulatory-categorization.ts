'use server';

/**
 * @fileOverview AI agent that suggests relevant categories and sub-categories for new regulations.
 *
 * - categorizeRegulation - A function that categorizes a new regulation.
 * - CategorizeRegulationInput - The input type for the categorizeRegulation function.
 * - CategorizeRegulationOutput - The return type for the categorizeRegulation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeRegulationInputSchema = z.object({
  regulationText: z.string().describe('The text content of the new regulation.'),
});

export type CategorizeRegulationInput = z.infer<typeof CategorizeRegulationInputSchema>;

const CategorizeRegulationOutputSchema = z.object({
  suggestedCategories: z
    .array(z.string())
    .describe('An array of suggested categories for the regulation.'),
  suggestedSubCategories: z
    .array(z.string())
    .describe('An array of suggested sub-categories for the regulation.'),
});

export type CategorizeRegulationOutput = z.infer<typeof CategorizeRegulationOutputSchema>;

export async function categorizeRegulation(
  input: CategorizeRegulationInput
): Promise<CategorizeRegulationOutput> {
  return categorizeRegulationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeRegulationPrompt',
  input: {schema: CategorizeRegulationInputSchema},
  output: {schema: CategorizeRegulationOutputSchema},
  prompt: `You are an expert compliance officer specializing in categorizing financial regulations.

  Given the following regulation text, suggest relevant categories and sub-categories.
  Provide the response as an array of suggested categories and an array of suggested sub-categories.

  Regulation Text: {{{regulationText}}}
  `,
});

const categorizeRegulationFlow = ai.defineFlow(
  {
    name: 'categorizeRegulationFlow',
    inputSchema: CategorizeRegulationInputSchema,
    outputSchema: CategorizeRegulationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
