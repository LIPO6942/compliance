'use server';

/**
 * @fileOverview A flow for fetching compliance news.
 *
 * - fetchComplianceNews - A function that returns a list of compliance news items.
 * - ComplianceNewsOutput - The return type for the fetchComplianceNews function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { NewsItem } from '@/types/compliance';
import { initialMockNews } from '@/data/mockNews';

// Define the output schema based on the NewsItem type.
const ComplianceNewsOutputSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    date: z.string(),
    source: z.enum(["CGA", "JORT", "GAFI", "OFAC", "UE", "Autre"]),
    description: z.string(),
    url: z.string().optional(),
  })
);

export type ComplianceNewsOutput = z.infer<typeof ComplianceNewsOutputSchema>;

// This is the main exported function that the UI will call.
export async function fetchComplianceNews(): Promise<ComplianceNewsOutput> {
  return fetchComplianceNewsFlow();
}

const fetchComplianceNewsFlow = ai.defineFlow(
  {
    name: 'fetchComplianceNewsFlow',
    inputSchema: z.void(),
    outputSchema: ComplianceNewsOutputSchema,
  },
  async () => {
    // For now, this flow returns mock data.
    // In the future, this could be replaced with a call to a real news API or a web scraper.
    const sortedNews = [...initialMockNews].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sortedNews;
  }
);
