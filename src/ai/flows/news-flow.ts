
'use server';

/**
 * @fileOverview A flow for fetching compliance news from the NewsAPI.
 *
 * - fetchComplianceNews - A function that returns a list of compliance news items.
 * - ComplianceNewsOutput - The return type for the fetchComplianceNews function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { NewsItem } from '@/types/compliance';

const ComplianceNewsOutputSchema = z.array(
  z.object({
    id: z.string().describe("Un identifiant unique pour l'actualité."),
    title: z.string().describe("Le titre de l'article de presse."),
    date: z.string().describe("La date de publication au format AAAA-MM-JJ."),
    source: z.enum(["CGA", "JORT", "GAFI", "OFAC", "UE", "Autre"]).describe("La source de l'information."),
    description: z.string().describe("Une courte description (1-2 phrases) de l'actualité."),
    url: z.string().url().optional().describe("L'URL vers l'article complet, si disponible."),
    imageUrl: z.string().url().optional().describe("L'URL d'une image pour l'article."),
  })
).describe("Une liste d'articles d'actualité sur la conformité.");

export type ComplianceNewsOutput = z.infer<typeof ComplianceNewsOutputSchema>;

export async function fetchComplianceNews(): Promise<ComplianceNewsOutput> {
  return fetchComplianceNewsFlow();
}

const mapSourceToEnum = (sourceName?: string | null): NewsItem['source'] => {
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
    const NEWS_API_KEY = process.env.NEWS_API_KEY;

    if (!NEWS_API_KEY) {
      console.error("[NEWS FLOW] Clé API NewsAPI (NEWS_API_KEY) non trouvée. Le fil d'actualité sera vide.");
      return [];
    }

    try {
      const query = encodeURIComponent('("conformité financière" OR "réglementation assurance" OR "lutte anti-blanchiment") AND (NOT "crypto")');
      const url = `https://newsapi.org/v2/everything?q=${query}&language=fr&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`;
      
      console.log(`[NEWS FLOW] Appel de l'API NewsAPI avec l'URL: ${url.replace(NEWS_API_KEY, '***')}`);

      const response = await fetch(url);
      
      console.log(`[NEWS FLOW] Statut de la réponse de NewsAPI: ${response.status}`);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[NEWS FLOW] Erreur de l'API NewsAPI. Statut: ${response.status}. Réponse: ${errorBody}`);
        return [];
      }

      const newsData = await response.json() as { articles?: any[], totalResults?: number, status: string, code?: string, message?: string };
      
      if (newsData.status === 'error') {
          console.error(`[NEWS FLOW] Erreur renvoyée par l'API NewsAPI: ${newsData.code} - ${newsData.message}`);
          return [];
      }

      if (!newsData || !newsData.articles || newsData.articles.length === 0) {
        console.warn("[NEWS FLOW] NewsAPI n'a retourné aucun article pour la requête. Le fil d'actualité sera vide.");
        return [];
      }

      console.log(`[NEWS FLOW] Articles reçus de NewsAPI: ${newsData.articles.length}`);

      const transformedNews: NewsItem[] = newsData.articles
        .map((article: any): NewsItem | null => {
          // Final, simplified filter: Only reject if there's no title.
          if (!article?.title || article.title === '[Removed]') {
             console.warn(`[NEWS FLOW] Article ignoré car il manque un titre:`, article);
             return null;
          }
          try {
            // Use article.url as a unique ID, or title+publishedAt if URL is missing
            const uniqueId = article.url || `${article.title}-${article.publishedAt}`;
            return {
              id: uniqueId, 
              title: article.title,
              date: new Date(article.publishedAt).toISOString().split('T')[0],
              source: mapSourceToEnum(article.source?.name),
              description: article.description || "Aucune description disponible.", // Provide a fallback
              url: article.url || undefined, // URL is optional
              imageUrl: article.urlToImage || undefined,
            };
          } catch (transformError) {
             console.error(`[NEWS FLOW] Erreur lors de la transformation d'un article:`, transformError, "Données de l'article:", article);
             return null;
          }
        })
        .filter((item): item is NewsItem => item !== null);
        
      console.log(`[NEWS FLOW] Articles transformés avec succès: ${transformedNews.length}`);
      return transformedNews;

    } catch (error) {
      console.error("[NEWS FLOW] Erreur majeure inattendue dans le flux de récupération des actualités:", error);
      return [];
    }
  }
);
