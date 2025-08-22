
'use server';

/**
 * @fileOverview A flow for fetching compliance news from multiple APIs (NewsAPI, GNews, MarketAux).
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
    source: z.enum(["NewsAPI", "GNews", "MarketAux", "CGA", "JORT", "GAFI", "OFAC", "UE", "Autre"]).describe("La source de l'information."),
    description: z.string().describe("Une courte description (1-2 phrases) de l'actualité."),
    url: z.string().url().optional().describe("L'URL vers l'article complet, si disponible."),
    imageUrl: z.string().url().optional().describe("L'URL d'une image pour l'article."),
  })
).describe("Une liste d'articles d'actualité sur la conformité.");

export type ComplianceNewsOutput = z.infer<typeof ComplianceNewsOutputSchema>;

export async function fetchComplianceNews(): Promise<ComplianceNewsOutput> {
  return fetchComplianceNewsFlow();
}

// Fetcher for NewsAPI.org
const fetchFromNewsAPI = async (): Promise<NewsItem[]> => {
    const NEWS_API_KEY = process.env.NEWS_API_KEY;
    if (!NEWS_API_KEY) return [];

    try {
        const query = encodeURIComponent('("conformité financière" OR "réglementation assurance" OR "lutte anti-blanchiment") AND (NOT "crypto")');
        const url = `https://newsapi.org/v2/everything?q=${query}&language=fr&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`;
        
        const response = await fetch(url);
        if (!response.ok) return [];

        const newsData = await response.json() as { articles?: any[], status: string };
        if (newsData.status !== 'ok' || !newsData.articles) return [];

        return newsData.articles
            .map((article: any): NewsItem | null => {
                if (!article?.title || article.title === '[Removed]') return null;
                return {
                    id: article.url || `${article.title}-${article.publishedAt}`,
                    title: article.title,
                    date: new Date(article.publishedAt).toISOString().split('T')[0],
                    source: 'NewsAPI',
                    description: article.description || "Aucune description disponible.",
                    url: article.url || undefined,
                    imageUrl: article.urlToImage || undefined,
                };
            })
            .filter((item): item is NewsItem => item !== null);
    } catch (error) {
        return [];
    }
};

// Fetcher for GNews.io
const fetchFromGNews = async (): Promise<NewsItem[]> => {
    const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
    if (!GNEWS_API_KEY) return [];
    
    try {
        const query = encodeURIComponent('"conformité financière" OR "lutte anti-blanchiment"');
        const url = `https://gnews.io/api/v4/search?q=${query}&lang=fr&country=fr,be,ch,ca&topic=business&max=5&apikey=${GNEWS_API_KEY}`;
        
        const response = await fetch(url);
        if (!response.ok) return [];
        
        const newsData = await response.json() as { articles?: any[] };
        if (!newsData.articles) return [];

        return newsData.articles
            .map((article: any): NewsItem | null => {
                if (!article?.title) return null;
                return {
                    id: article.url,
                    title: article.title,
                    date: new Date(article.publishedAt).toISOString().split('T')[0],
                    source: 'GNews',
                    description: article.description || "Aucune description disponible.",
                    url: article.url || undefined,
                    imageUrl: article.image || undefined,
                };
            })
            .filter((item): item is NewsItem => item !== null);
    } catch (error) {
        return [];
    }
};

// Fetcher for MarketAux
const fetchFromMarketAux = async (): Promise<NewsItem[]> => {
    const MARKETAUX_API_KEY = process.env.MARKETAUX_API_KEY;
    if (!MARKETAUX_API_KEY) return [];

    try {
        const query = encodeURIComponent('(compliance OR regulation) AND (finance OR insurance OR banking)');
        const url = `https://api.marketaux.com/v1/news/all?search=${query}&language=fr&limit=5&api_token=${MARKETAUX_API_KEY}`;

        const response = await fetch(url);
        if (!response.ok) return [];

        const newsData = await response.json() as { data?: any[] };
        if (!newsData.data) return [];

        return newsData.data
            .map((article: any): NewsItem | null => {
                if (!article?.title) return null;
                return {
                    id: article.uuid,
                    title: article.title,
                    date: new Date(article.published_on).toISOString().split('T')[0],
                    source: 'MarketAux',
                    description: article.description || "Aucune description disponible.",
                    url: article.url || undefined,
                    imageUrl: article.image_url || undefined,
                };
            })
            .filter((item): item is NewsItem => item !== null);
    } catch (error) {
        return [];
    }
};


const fetchComplianceNewsFlow = ai.defineFlow(
  {
    name: 'fetchComplianceNewsFlow',
    inputSchema: z.void(),
    outputSchema: ComplianceNewsOutputSchema,
  },
  async () => {
    // Run all fetches in parallel
    const results = await Promise.allSettled([
      fetchFromNewsAPI(),
      fetchFromGNews(),
      fetchFromMarketAux(),
    ]);

    let allNews: NewsItem[] = [];

    // Process results from all fetchers
    results.forEach((result) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            allNews.push(...result.value);
        }
    });
    
    console.log(`[NEWS FLOW] Total d'articles reçus (brut): ${allNews.length}.`);

    // Deduplicate news items based on URL, which is a more reliable unique identifier
    const uniqueNews = allNews.filter((item, index, self) =>
        item.url && self.findIndex(t => t.url === item.url) === index
    );
    
    console.log(`[NEWS FLOW] Total d'articles uniques après déduplication: ${uniqueNews.length}.`);

    // Sort by date, most recent first
    uniqueNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Return the top 5
    return uniqueNews.slice(0, 5);
  }
);
