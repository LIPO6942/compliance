
'use server';

/**
 * @fileOverview A flow for fetching compliance news from multiple APIs (NewsAPI, GNews, MarketAux).
 *
 * - fetchComplianceNews - A function that returns a list of compliance news items.
 * - ComplianceNewsOutput - The return type for the fetchComplianceNews function.
 */

import { z } from 'zod';
import type { NewsItem } from '@/types/compliance';
import Parser from 'rss-parser';


const ComplianceNewsOutputSchema = z.array(
    z.object({
        id: z.string().describe("Un identifiant unique pour l'actualité."),
        title: z.string().describe("Le titre de l'article de presse."),
        date: z.string().describe("La date de publication au format AAAA-MM-JJ."),
        source: z.enum(["NewsAPI", "GNews", "MarketAux", "Google News", "CGA", "JORT", "GAFI", "OFAC", "UE", "AML Intelligence", "ComplyAdvantage", "KPMG", "FATF", "Autre"]).describe("La source de l'information."),
        description: z.string().describe("Une courte description (1-2 phrases) de l'actualité."),
        url: z.string().url().optional().describe("L'URL vers l'article complet, si disponible."),
        imageUrl: z.string().url().optional().describe("L'URL d'une image pour l'article."),
    })
).describe("Une liste d'articles d'actualité sur la conformité.");

export type ComplianceNewsOutput = z.infer<typeof ComplianceNewsOutputSchema>;

export async function fetchComplianceNews(): Promise<ComplianceNewsOutput> {
    return fetchComplianceNewsFlow();
}

export async function summarizeNewsFlow(newsItems: NewsItem[]): Promise<string> {
    if (newsItems.length === 0) return "Aucune actualité à synthétiser.";

    const titles = newsItems.map(item => `- ${item.title}`).join('\n');
    const prompt = `Voici les dernières actualités de conformité LCB-FT, GRC et Sanctions :\n${titles}\n\nAgis en tant qu'expert GRC (Gouvernance, Risque et Conformité). Analyse ces titres et fournis un "Briefing IA Cognitive" très concis en exactement 3 points clés (bullet points).
Ta synthèse doit identifier :
1. Les tendances majeures ou thèmes récurrents.
2. Les alertes critiques (ex: GAFI/FATF, nouvelles sanctions, régulations UE).
3. L'impact opérationnel immédiat pour un responsable conformité.

Réponds en français, avec un ton professionnel, précis et percutant. Utilise des emojis pertinents.`;

    return callGroqChatCompletion(prompt);
}

// Fetcher for NewsAPI.org
const fetchFromNewsAPI = async (): Promise<NewsItem[]> => {
    const NEWS_API_KEY = process.env.NEWS_API_KEY;
    if (!NEWS_API_KEY) return [];

    try {
        const query = encodeURIComponent('"conformité GRC" OR "compliance LCB-FT" OR "lutte contre le blanchiment" OR "Sapin II" OR "anti-corruption" OR "FATF"');
        const url = `https://newsapi.org/v2/everything?q=${query}&language=fr&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_API_KEY}`;

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
        const query = encodeURIComponent('"conformité réglementaire" OR "LCB-FT Tunisie" OR "GAFI" OR "FATF" OR "déontologie financière"');
        const url = `https://gnews.io/api/v4/search?q=${query}&lang=fr&topic=business&max=20&apikey=${GNEWS_API_KEY}`;

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
        const query = encodeURIComponent('("compliance" OR "regulatory" OR "AML-CFT" OR "Anti-Bribery") AND (finance OR insurance)');
        const url = `https://api.marketaux.com/v1/news/all?search=${query}&language=fr&limit=20&api_token=${MARKETAUX_API_KEY}`;

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
        const query = encodeURIComponent('"Conformité MAE" OR "LCB-FT Tunisie" OR "Gouvernance et Conformité" OR "FATF news" OR "Contrôle interne GRC" OR "Audit de conformité bancaire"');
        const url = `https://news.google.com/rss/search?q=${query}&hl=fr&gl=FR&ceid=FR:fr`;

        const feed = await parser.parseURL(url);
        if (!feed.items) return [];

        return feed.items.slice(0, 20).map((item: any): NewsItem | null => {
            if (!item.title || !item.link) return null;
            const itemDate = item.isoDate ? new Date(item.isoDate) : new Date(); // Fallback to current date
            return {
                id: item.guid || item.link,
                title: item.title,
                date: itemDate.toISOString().split('T')[0],
                source: 'Google News',
                description: item.contentSnippet || 'Aucune description disponible.',
                url: item.link,
                imageUrl: undefined,
            };
        }).filter((item: NewsItem | null): item is NewsItem => item !== null);

    } catch (error) {
        console.error("[NEWS FLOW] Error fetching from Google News RSS:", error);
        return [];
    }
};

// Fetcher for AML Intelligence RSS
const fetchFromAMLIntelligence = async (): Promise<NewsItem[]> => {
    try {
        const parser = new Parser();
        const url = `https://amlintelligence.com/feed`;

        const feed = await parser.parseURL(url);
        if (!feed.items) return [];

        return feed.items.slice(0, 10).map((item: any): NewsItem | null => {
            if (!item.title || !item.link) return null;
            const itemDate = item.isoDate ? new Date(item.isoDate) : new Date();
            return {
                id: item.guid || item.link,
                title: item.title,
                date: itemDate.toISOString().split('T')[0],
                source: 'AML Intelligence',
                description: item.contentSnippet || 'Actualité spécialisée LCB-FT.',
                url: item.link,
                imageUrl: undefined,
            };
        }).filter((item: NewsItem | null): item is NewsItem => item !== null);

    } catch (error) {
        console.error("[NEWS FLOW] Error fetching from AML Intelligence RSS:", error);
        return [];
    }
};

// Fetcher for ComplyAdvantage RSS
const fetchFromComplyAdvantage = async (): Promise<NewsItem[]> => {
    try {
        const parser = new Parser();
        const url = `https://complyadvantage.com/feed`;

        const feed = await parser.parseURL(url);
        if (!feed.items) return [];

        return feed.items.slice(0, 10).map((item: any): NewsItem | null => {
            if (!item.title || !item.link) return null;
            const itemDate = item.isoDate ? new Date(item.isoDate) : new Date();
            return {
                id: item.guid || item.link,
                title: item.title,
                date: itemDate.toISOString().split('T')[0],
                source: 'ComplyAdvantage',
                description: item.contentSnippet || 'Analyses et perspectives de conformité.',
                url: item.link,
                imageUrl: undefined,
            };
        }).filter((item: NewsItem | null): item is NewsItem => item !== null);

    } catch (error) {
        // Fallback or retry logic can be added here if needed
        console.error("[NEWS FLOW] Error fetching from ComplyAdvantage RSS:", error);
        return [];
    }
};

// Fetcher for KPMG Compliance RSS (via search as direct general feed is often gated)
const fetchFromKPMG = async (): Promise<NewsItem[]> => {
    try {
        const parser = new Parser();
        // KPMG often uses specific regional or topical feeds. This targets general regulatory insights if available via search-like RSS
        const url = `https://news.google.com/rss/search?q=site:kpmg.com+compliance+OR+regulatory&hl=en&gl=US&ceid=US:en`;

        const feed = await parser.parseURL(url);
        if (!feed.items) return [];

        return feed.items.slice(0, 5).map((item: any): NewsItem | null => {
            if (!item.title || !item.link) return null;
            const itemDate = item.isoDate ? new Date(item.isoDate) : new Date();
            return {
                id: item.guid || item.link,
                title: item.title,
                date: itemDate.toISOString().split('T')[0],
                source: 'KPMG',
                description: item.contentSnippet || 'Insights réglementaires et conformité KPMG.',
                url: item.link,
                imageUrl: undefined,
            };
        }).filter((item: NewsItem | null): item is NewsItem => item !== null);

    } catch (error) {
        console.error("[NEWS FLOW] Error fetching from KPMG RSS:", error);
        return [];
    }
};

// Fetcher for FATF (GAFI) Latest Publications
const fetchFromFATF = async (): Promise<NewsItem[]> => {
    try {
        const parser = new Parser();
        const url = `https://www.fatf-gafi.org/en/publications.rss`;

        const feed = await parser.parseURL(url);
        if (!feed.items) return [];

        return feed.items.slice(0, 10).map((item: any): NewsItem | null => {
            if (!item.title || !item.link) return null;
            const itemDate = item.isoDate ? new Date(item.isoDate) : new Date();
            return {
                id: item.guid || item.link,
                title: item.title,
                date: itemDate.toISOString().split('T')[0],
                source: 'FATF',
                description: item.contentSnippet || 'Latest publications and guidance from the FATF-GAFI.',
                url: item.link,
                imageUrl: undefined,
            };
        }).filter((item: NewsItem | null): item is NewsItem => item !== null);

    } catch (error) {
        console.error("[NEWS FLOW] Error fetching from FATF RSS:", error);
        return [];
    }
};
async function fetchComplianceNewsFlow(): Promise<ComplianceNewsOutput> {
    const allNewsPromises = [
        fetchFromNewsAPI(),
        fetchFromGNews(),
        fetchFromMarketAux(),
        fetchFromGoogleNewsRSS(),
        fetchFromAMLIntelligence(),
        fetchFromComplyAdvantage(),
        fetchFromKPMG(),
        fetchFromFATF(),
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

    // Increase the final slice to have a larger pool of recent articles
    return ComplianceNewsOutputSchema.parse(uniqueNews.slice(0, 25));
}

async function callGroqChatCompletion(prompt: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.error('[AI] Missing GROQ_API_KEY');
        return 'L\'assistant IA est temporairement indisponible (Clé API manquante).';
    }

    const model = process.env.GROQ_MODEL || 'llama3-8b-8192';

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: 'Tu es un assistant expert en conformité GRC et LCB-FT. Ta mission est de fournir des briefings stratégiques basés sur les actualités.' },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.4,
            }),
        });

        if (!res.ok) {
            console.error('[AI] Groq API error', res.status);
            return 'Erreur lors de la génération du briefing IA.';
        }

        const data: any = await res.json();
        const content: string | undefined = data?.choices?.[0]?.message?.content;
        return content ?? 'Impossible de générer la synthèse.';
    } catch (err) {
        console.error('[AI] Groq request failed', err);
        return 'Erreur de connexion au moteur IA.';
    }
}
