
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
import fetch from 'node-fetch';


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
      console.error("[NEWS DEBUG] Clé API GNews non configurée (GNEWS_API_KEY). Impossible de récupérer les actualités.");
      return [];
    }
    
    console.log("[NEWS DEBUG] Tentative de récupération des actualités depuis GNews.");

    try {
        const query = encodeURIComponent('"conformité assurance" OR "lutte anti-blanchiment"');
        const url = `https://gnews.io/api/v4/search?q=${query}&lang=fr&country=fr,be,ch,ca&topic=business&max=5&apikey=${GNEWS_API_KEY}`;
        
        console.log(`[NEWS DEBUG] Appel de l'URL: ${url.replace(GNEWS_API_KEY, '*****')}`);

        const response = await fetch(url);
        
        console.log(`[NEWS DEBUG] Statut de la réponse de GNews: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[NEWS DEBUG] Erreur lors de la récupération des actualités depuis GNews:", errorText);
            return [];
        }

        const newsData: any = await response.json();

        if (!newsData.articles || newsData.articles.length === 0) {
           console.warn("[NEWS DEBUG] GNews n'a retourné aucun article pour la requête.");
           return [];
        }

        console.log(`[NEWS DEBUG] ${newsData.articles.length} articles reçus de GNews. Tentative de transformation.`);

        try {
            const realNews: NewsItem[] = newsData.articles.slice(0, 5).map((article: any, index: number) => ({
                id: article.url || `real-news-${index}`,
                title: article.title,
                date: new Date(article.publishedAt).toISOString().split('T')[0],
                source: mapSourceToEnum(article.source.name),
                description: article.description,
                url: article.url,
                imageUrl: article.image,
            }));
            
            console.log("[NEWS DEBUG] Transformation réussie. Retour des articles.", realNews);
            return realNews;

        } catch (transformError) {
            console.error("[NEWS DEBUG] Erreur lors de la transformation des articles GNews:", transformError);
            console.error("[NEWS DEBUG] Données brutes de l'article problématique:", newsData.articles[0]); // Log the first article for inspection
            return [];
        }

    } catch (error) {
        console.error("[NEWS DEBUG] Erreur inattendue lors de la connexion à GNews:", error);
        return [];
    }
  }
);
