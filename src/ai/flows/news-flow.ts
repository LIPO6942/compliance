
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
import Parser from 'rss-parser';


const ComplianceNewsOutputSchema = z.array(
  z.object({
    id: z.string().describe("Un identifiant unique pour l'actualité."),
    title: z.string().describe("Le titre de l'article de presse."),
    date: z.string().describe("La date de publication au format AAAA-MM-JJ."),
    source: z.enum(["NewsAPI", "GNews", "MarketAux", "Google News", "CGA", "JORT", "GAFI", "OFAC", "UE", "Autre"]).describe("La source de l'information."),
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
        const query = encodeURIComponent('"conformité financière" OR "réglementation assurance" OR "lutte anti-blanchiment"');
        const url = `https://newsapi.org/v2/everything?q=${query}&language=fr&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`;
        
        const response = await fetch(url);
        if (!response.ok) return [];

        const newsData = await response.json() as { articles?: any[], status: string };
        if (newsData.status !== 'ok' || !newsData.articles) return [];

        return newsData.articles
            .map((article: any): NewsItem | null => {
                if (!article?.title || article.title === '[Removed]' || !article.url) return null;
                return {
                    id: article.url,
                    title: article.title,
                    date: new Date(article.publishedAt).toISOString().split('T')[0],
                    source: 'NewsAPI',
                    description: article.description || "Aucune description disponible.",
                    url: article.url,
                    imageUrl: article.urlToImage || undefined,
                };
            })
            .filter((item): item is NewsItem => item !== null);
    } catch (error) {
        console.error("[NEWS FLOW] Error fetching from NewsAPI:", error);
        return [];
    }
};

// Fetcher for GNews.io
const fetchFromGNews = async (): Promise<NewsItem[]> => {
    const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
    if (!GNEWS_API_KEY) return [];
    
    try {
        const query = encodeURIComponent('"conformité financière" OR "réglementation assurance" OR "lutte anti-blanchiment"');
        const url = `https://gnews.io/api/v4/search?q=${query}&lang=fr&country=fr,be,ch,ca&topic=business&max=10&apikey=${GNEWS_API_KEY}`;
        
        const response = await fetch(url);
        if (!response.ok) return [];
        
        const newsData = await response.json() as { articles?: any[] };
        if (!newsData.articles) return [];

        return newsData.articles
            .map((article: any): NewsItem | null => {
                if (!article?.title || !article.url) return null;
                return {
                    id: article.url,
                    title: article.title,
                    date: new Date(article.publishedAt).toISOString().split('T')[0],
                    source: 'GNews',
                    description: article.description || "Aucune description disponible.",
                    url: article.url,
                    imageUrl: article.image || undefined,
                };
            })
            .filter((item): item is NewsItem => item !== null);
    } catch (error) {
        console.error("[NEWS FLOW] Error fetching from GNews:", error);
        return [];
    }
};

// Fetcher for MarketAux
const fetchFromMarketAux = async (): Promise<NewsItem[]> => {
    const MARKETAUX_API_KEY = process.env.MARKETAUX_API_KEY;
    if (!MARKETAUX_API_KEY) return [];

    try {
        const query = encodeURIComponent('(compliance OR regulation) AND (finance OR insurance OR banking)');
        const url = `https://api.marketaux.com/v1/news/all?search=${query}&language=fr&limit=10&api_token=${MARKETAUX_API_KEY}`;

        const response = await fetch(url);
        if (!response.ok) return [];

        const newsData = await response.json() as { data?: any[] };
        if (!newsData.data) return [];

        return newsData.data
            .map((article: any): NewsItem | null => {
                if (!article?.title || !article.url) return null;
                return {
                    id: article.uuid,
                    title: article.title,
                    date: new Date(article.published_on).toISOString().split('T')[0],
                    source: 'MarketAux',
                    description: article.description || "Aucune description disponible.",
                    url: article.url,
                    imageUrl: article.image_url || undefined,
                };
            })
            .filter((item): item is NewsItem => item !== null);
    } catch (error) {
        console.error("[NEWS FLOW] Error fetching from MarketAux:", error);
        return [];
    }
};

// Fetcher for Google News RSS
const fetchFromGoogleNewsRSS = async (): Promise<NewsItem[]> => {
    try {
        const parser = new Parser();
        const query = encodeURIComponent('conformité financière OR réglementation assurance OR LBA-FT');
        const url = `https://news.google.com/rss/search?q=${query}&hl=fr&gl=FR&ceid=FR:fr`;

        const feed = await parser.parseURL(url);
        if (!feed.items) return [];

        return feed.items.slice(0, 10).map((item): NewsItem | null => {
            if (!item.title || !item.link || !item.isoDate) return null;
            return {
                id: item.guid || item.link,
                title: item.title,
                date: new Date(item.isoDate).toISOString().split('T')[0],
                source: 'Google News',
                description: item.contentSnippet || 'Aucune description disponible.',
                url: item.link,
                imageUrl: undefined, 
            };
        }).filter((item): item is NewsItem => item !== null && !!item.url);

    } catch (error) {
        console.error("[NEWS FLOW] Error fetching from Google News RSS:", error);
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
    const allNewsPromises = [
        fetchFromNewsAPI(),
        fetchFromGNews(),
        fetchFromMarketAux(),
        fetchFromGoogleNewsRSS(),
    ];
    const results = await Promise.allSettled(allNewsPromises);

    let allNews: NewsItem[] = [];
    results.forEach((result) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            allNews.push(...result.value);
        }
    });
    
    console.log(`[NEWS FLOW] Total d'articles reçus de toutes les sources: ${allNews.length}.`);

    const uniqueNewsByUrl = new Map<string, NewsItem>();
    for (const item of allNews) {
        if (item.url && !uniqueNewsByUrl.has(item.url)) {
            uniqueNewsByUrl.set(item.url, item);
        }
    }
    const uniqueNews = Array.from(uniqueNewsByUrl.values());
    
    console.log(`[NEWS FLOW] Total d'articles uniques (après déduplication par URL): ${uniqueNews.length}.`);

    uniqueNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return uniqueNews.slice(0, 5);
  }
);
