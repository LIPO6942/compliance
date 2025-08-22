
'use server';

/**
 * @fileOverview A flow for fetching compliance news from a real news API.
 *
 * - fetchComplianceNews - A function that returns a list of compliance news items.
 * - ComplianceNewsOutput - The return type for the fetchComplianceNews function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { NewsItem } from '@/types/compliance';

// Define the output schema based on the NewsItem type.
const ComplianceNewsOutputSchema = z.array(
  z.object({
    id: z.string().describe("Un identifiant unique pour l'actualité, ex: 'news-1'."),
    title: z.string().describe("Le titre de l'article de presse."),
    date: z.string().describe("La date de publication au format AAAA-MM-JJ."),
    source: z.enum(["CGA", "JORT", "GAFI", "OFAC", "UE", "Autre"]).describe("La source de l'information."),
    description: z.string().describe("Une courte description (1-2 phrases) de l'actualité."),
    url: z.string().url().optional().describe("L'URL vers l'article complet, si disponible."),
    imageUrl: z.string().url().optional().describe("L'URL d'une image pour l'article."),
  })
).describe("Une liste d'articles d'actualité sur la conformité.");

export type ComplianceNewsOutput = z.infer<typeof ComplianceNewsOutputSchema>;

// This is the main exported function that the UI will call.
export async function fetchComplianceNews(): Promise<ComplianceNewsOutput> {
  return fetchComplianceNewsFlow();
}

const mapSourceToEnum = (sourceName: string): NewsItem['source'] => {
  if (!sourceName) return 'Autre';
  const lowerSourceName = sourceName.toLowerCase();
  if (lowerSourceName.includes('cga')) return 'CGA';
  if (lowerSourceName.includes('jort')) return 'JORT';
  if (lowerSourceName.includes('fatf') || lowerSourceName.includes('gafi')) return 'GAFI';
  if (lowerSourceName.includes('ofac')) return 'OFAC';
  if (lowerSourceName.includes('european union') || lowerSourceName.includes('ue')) return 'UE';
  return 'Autre';
};


const fetchComplianceNewsFlow = ai.defineFlow(
  {
    name: 'fetchComplianceNewsFlow',
    inputSchema: z.void(),
    outputSchema: ComplianceNewsOutputSchema,
  },
  async () => {
    
    const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

    if (!GNEWS_API_KEY) {
      console.error("[NEWS FLOW] Clé API GNews (GNEWS_API_KEY) non trouvée dans les variables d'environnement. Le flux ne peut pas s'exécuter.");
      return [];
    }
    
    try {
        const query = encodeURIComponent('"conformité assurance" OR "lutte anti-blanchiment"');
        const url = `https://gnews.io/api/v4/search?q=${query}&lang=fr&country=fr,be,ch,ca&topic=business&max=5&apikey=${GNEWS_API_KEY}`;
        
        const response = await fetch(url);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[NEWS FLOW] Erreur de l'API GNews. Statut: ${response.status}. Réponse: ${errorBody}`);
            return []; // Return empty on API error
        }

        const newsData = await response.json() as { articles?: any[] };

        if (!newsData.articles || newsData.articles.length === 0) {
           console.warn("[NEWS FLOW] GNews n'a retourné aucun article pour la requête.");
           return [];
        }

        const transformedNews: NewsItem[] = newsData.articles
            .map((article: any, index: number): NewsItem | null => {
                // Basic validation to ensure the article is usable
                if (!article || !article.title || !article.description || !article.url) {
                    console.warn('[NEWS FLOW] Article ignoré car il manque des champs essentiels:', article);
                    return null;
                }
                return {
                    id: article.url, // Use URL as a unique ID
                    title: article.title,
                    date: new Date(article.publishedAt).toISOString().split('T')[0],
                    source: mapSourceToEnum(article.source?.name),
                    description: article.description,
                    url: article.url,
                    imageUrl: article.image || undefined, // Use image if present, otherwise undefined
                };
            })
            .filter((item): item is NewsItem => item !== null) // Filter out any null (skipped) articles
            .slice(0, 5); // Ensure we don't exceed 5 articles

        return transformedNews;

    } catch (error) {
        console.error("[NEWS FLOW] Erreur inattendue lors de la récupération ou du traitement des actualités:", error);
        return []; // Return empty on any other error
    }
  }
);
