
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
        source: z.enum(["NewsAPI", "GNews", "MarketAux", "Google News", "CGA", "JORT", "GAFI", "OFAC", "UE", "AML Intelligence", "ComplyAdvantage", "KPMG", "FATF", "Juridoc.tn", "Autre"]).describe("La source de l'information."),
        description: z.string().describe("Une courte description (1-2 phrases) de l'actualité."),
        url: z.string().url().optional().describe("L'URL vers l'article complet, si disponible."),
        imageUrl: z.string().url().optional().describe("L'URL d'une image pour l'article."),
        score: z.number().optional(),
        isHighPriority: z.boolean().optional(),
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
        const query = encodeURIComponent('("conformité GRC" OR "compliance LCB-FT" OR "anti-corruption" OR "FATF") AND (Tunisie OR "Banque Centrale" OR "CTAF" OR "CGA Tunisie" OR "INPDP")');
        const url = `https://newsapi.org/v2/everything?q=${query}&language=fr&sortBy=relevancy&pageSize=20&apiKey=${NEWS_API_KEY}`;

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
        const query = encodeURIComponent('"conformité" Tunisie OR "LCB-FT" Tunisie OR "GAFI" OR "FATF" OR "CTAF" OR "BCT" OR "CMF Tunisie"');
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
        const query = encodeURIComponent('(Conformité Tunisie) OR (LCB-FT Tunisie) OR (CTAF Tunisie) OR (CGA Tunisie) OR (BCT réglementation) OR (INPDP protection données)');
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

// Fetcher for Juridoc.tn - Publications de conformité réglementaire tunisienne
// Juridoc.tn is a SPA without a native RSS feed, so we use Google News RSS
// targeting juridoc.tn content and Tunisian regulatory compliance topics.
const fetchFromJuridocTN = async (): Promise<NewsItem[]> => {
    try {
        const parser = new Parser();
        const results: NewsItem[] = [];

        // Query 1: Publications directly mentioning juridoc.tn
        const query1 = encodeURIComponent('site:juridoc.tn OR (juridoc.tn conformité réglementaire)');
        const url1 = `https://news.google.com/rss/search?q=${query1}&hl=fr&gl=TN&ceid=TN:fr`;

        // Query 2: Tunisian regulatory compliance publications (JORT, BCT, CGA, AMF Tunisie)
        const query2 = encodeURIComponent('"conformité réglementaire" Tunisie OR "textes réglementaires" Tunisie OR "JORT" conformité OR "Banque Centrale Tunisie" réglementaire OR "loi tunisienne" conformité OR "décret tunisien" conformité');
        const url2 = `https://news.google.com/rss/search?q=${query2}&hl=fr&gl=TN&ceid=TN:fr`;

        const [feed1, feed2] = await Promise.allSettled([
            parser.parseURL(url1),
            parser.parseURL(url2),
        ]);

        const processItems = (items: any[]): NewsItem[] => {
            return items.map((item: any): NewsItem | null => {
                if (!item.title || !item.link) return null;
                const itemDate = item.isoDate ? new Date(item.isoDate) : new Date();
                
                // Determine source dynamically
                let source: any = 'Google News';
                if (item.link.includes('juridoc.tn')) source = 'Juridoc.tn';
                else if (item.link.includes('bct.gov.tn')) source = 'BCT';
                else if (item.link.includes('iort.gov.tn')) source = 'JORT';
                else if (item.link.includes('cga.gov.tn')) source = 'CGA';
                
                return {
                    id: item.guid || item.link,
                    title: item.title,
                    date: itemDate.toISOString().split('T')[0],
                    source: source,
                    description: item.contentSnippet || 'Information réglementaire tunisienne.',
                    url: item.link,
                    imageUrl: undefined,
                };
            }).filter((item: NewsItem | null): item is NewsItem => item !== null);
        };

        if (feed1.status === 'fulfilled' && feed1.value.items) {
            results.push(...processItems(feed1.value.items));
        }
        if (feed2.status === 'fulfilled' && feed2.value.items) {
            results.push(...processItems(feed2.value.items));
        }

        console.log(`[NEWS FLOW] Juridoc.tn: ${results.length} articles trouvés.`);
        return results;

    } catch (error) {
        console.error("[NEWS FLOW] Error fetching from Juridoc.tn:", error);
        return [];
    }
};

// Fetcher for Arabic News (specifically for Tunisia compliance)
const fetchFromArabicNews = async (): Promise<NewsItem[]> => {
    try {
        const parser = new Parser();
        const keywords = [
            'الامتثال', // Compliance
            'الهيئة العامة للتأمين', // CGA
            'البنك المركزي التونسي', // BCT
            'لجنة التحاليل المالية', // CTAF
            'مجلس السوق المالية', // CMF
            'هيئة حماية المعطيات الشخصية', // INPDP
            'الرائد الرسمي تونس', // JORT
            'مكافحة غسل الأموال', // AML
            'تمويل الإرهاب', // CFT
            'قانون المالية تونس', // Financial Law
            'شفافية المعاملات المالية', // Financial Transparency
            'حماية المعطيات الشخصية', // Data Protection
            'معايير بازل', // Basel Standards
            'المعايير الدولية للتقارير المالية' // IFRS
        ];
        
        const query = encodeURIComponent(`(${keywords.join(') OR (')})`);
        const url = `https://news.google.com/rss/search?q=${query}&hl=ar&gl=TN&ceid=TN:ar`;

        const feed = await parser.parseURL(url);
        if (!feed.items) return [];

        return feed.items.slice(0, 15).map((item: any): NewsItem | null => {
            if (!item.title || !item.link) return null;
            const itemDate = item.isoDate ? new Date(item.isoDate) : new Date();
            
            return {
                id: item.guid || item.link,
                title: item.title,
                date: itemDate.toISOString().split('T')[0],
                source: 'Autre', // Arabic news source
                description: item.contentSnippet || 'أخبار الامتثال والتنظيم في تونس.',
                url: item.link,
                imageUrl: undefined,
                isHighPriority: true // Any Arabic result for these queries is high priority local news
            };
        }).filter((item: NewsItem | null): item is NewsItem => item !== null);

    } catch (error) {
        console.error("[NEWS FLOW] Error fetching from Arabic News:", error);
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
        fetchFromJuridocTN(),
        fetchFromArabicNews(),
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

    const tunisiaKeywords = [
        'tunisie', 'tunisien', 'tunisienne', 'jort', 'bct', 'cga', 'ctaf', 'cmf', 'inpdp', 'juridoc', 'mae', 'tunis',
        'banque centrale', 'comité général des assurances', 'marché financier', 'loi tunisienne'
    ];

    const scoredNews = uniqueNews.map(item => {
        let score = new Date(item.date).getTime(); // Base score is the date
        const content = (item.title + " " + item.description).toLowerCase();
        let isTunisiaRelated = false;
        
        // Boost for Tunisia related content (+30 days equivalent boost per keyword)
        const dayInMs = 24 * 60 * 60 * 1000;
        tunisiaKeywords.forEach(kw => {
            if (content.includes(kw)) {
                score += (dayInMs * 30);
                isTunisiaRelated = true;
            }
        });

        // Extra boost if source is Juridoc.tn
        if (item.source === 'Juridoc.tn') {
            score += (dayInMs * 60);
            isTunisiaRelated = true;
        }

        // Boost for Arabic results from specific compliance queries
        const arabicKeywords = ['الامتثال', 'التأمين', 'المالية', 'المركزي', 'غسل', 'الأموال', 'الرائد'];
        arabicKeywords.forEach(kw => {
            if (content.includes(kw)) {
                score += (dayInMs * 45); // Heavy boost for Arabic compliance news
                isTunisiaRelated = true;
            }
        });

        return { ...item, score, isHighPriority: isTunisiaRelated };
    });

    scoredNews.sort((a, b) => b.score - a.score);

    // Increase the final slice to have a larger pool of recent articles
    return ComplianceNewsOutputSchema.parse(scoredNews.slice(0, 30));
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
