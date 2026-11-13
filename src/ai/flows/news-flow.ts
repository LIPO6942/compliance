
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
import { LEGAL_KNOWLEDGE_BASE } from '../constants/knowledge-base';


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
        originalTitle: z.string().optional(),
        originalLanguage: z.string().optional(),
        isTranslated: z.boolean().optional(),
        country: z.string().optional(),
        isFlash: z.boolean().optional(),
        flashType: z.string().optional(),
    })
).describe("Une liste d'articles d'actualité sur la conformité.");

export type ComplianceNewsOutput = z.infer<typeof ComplianceNewsOutputSchema>;

export async function fetchComplianceNews(): Promise<ComplianceNewsOutput> {
    return fetchComplianceNewsFlow();
}

export async function summarizeNewsFlow(newsItems: NewsItem[]): Promise<string> {
    if (newsItems.length === 0) return "Aucune actualité à synthétiser.";

    const titles = newsItems.map(item => `- [${item.isHighPriority ? '🇹🇳 Tunisie' : '🌍 International'}] ${item.title}`).join('\n');
    const prompt = `Voici les dernières actualités de conformité réglementaire, LCB-FT, GRC et Sanctions :\n${titles}\n\nAgis en tant qu'expert GRC (Gouvernance, Risque et Conformité) spécialisé dans le secteur financier et assurantiel tunisien. Analyse ces actualités et fournis un "Briefing IA Stratégique" concis en 3 points clés structurés :
1. 🇹🇳 Priorités Réglementaires Tunisie : impact direct des textes et alertes locales (BCT, CGA, CTAF, JORT, MAE).
2. 🌍 Veille Internationale & Sanctions : tendances globales majeures (GAFI/FATF, UE, OFAC).
3. ⚡ Recommandations Opérationnelles : 2 actions concrètes immédiates pour la conformité.

Réponds en français, avec un ton exécutif, précis et percutant. Utilise des puces et emojis pertinents.`;

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
        const query = encodeURIComponent('(Conformité Tunisie) OR (LCB-FT Tunisie) OR (CTAF Tunisie) OR (CGA Tunisie) OR (BCT réglementation) OR (INPDP protection données) OR (assurance Tunisie réglementation)');
        const url = `https://news.google.com/rss/search?q=${query}&hl=fr&gl=TN&ceid=TN:fr`;

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
                description: item.contentSnippet || 'Actualité réglementaire tunisienne.',
                url: item.link,
                imageUrl: undefined,
                isHighPriority: true,
                country: 'TN',
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
                country: 'INTL',
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
                country: 'INTL',
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
                country: 'INTL',
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
                country: 'INTL',
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
                    isHighPriority: true,
                    country: 'TN',
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
                isHighPriority: true, // Any Arabic result for these queries is high priority local news
                country: 'TN',
            };
        }).filter((item: NewsItem | null): item is NewsItem => item !== null);

    } catch (error) {
        console.error("[NEWS FLOW] Error fetching from Arabic News:", error);
        return [];
    }
};
// Helper de traduction automatique vers le français (Google Translate GTX API rapide et fiable)
async function translateTextToFrench(text: string): Promise<{ translated: string; sourceLang: string } | null> {
    if (!text || text.trim().length === 0) return null;
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=fr&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            signal: AbortSignal.timeout(3500)
        });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && Array.isArray(data[0])) {
                const translated = data[0].map((chunk: any) => chunk[0]).filter(Boolean).join('');
                const detectedLang = (data[2] || '').toLowerCase();
                // Si la langue détectée n'est pas le français et qu'une traduction est produite
                if (translated && detectedLang && detectedLang !== 'fr') {
                    return { translated: translated.trim(), sourceLang: detectedLang };
                }
            }
        }
    } catch {
        // Fallback transparent si timeout ou indisponible
    }
    return null;
}

async function translateNewsItem(item: NewsItem): Promise<NewsItem> {
    const isEnglishSource = ['AML Intelligence', 'ComplyAdvantage', 'KPMG', 'FATF', 'MarketAux'].includes(item.source);
    const hasArabic = /[\u0600-\u06FF]/.test(item.title);

    // Détection d'un titre en langue étrangère (anglais, arabe, etc.)
    if (isEnglishSource || hasArabic || !/[éèêàùçîôû]/.test(item.title)) {
        const translation = await translateTextToFrench(item.title);
        if (translation && translation.sourceLang !== 'fr') {
            return {
                ...item,
                originalTitle: item.title,
                title: translation.translated,
                isTranslated: true,
                originalLanguage: translation.sourceLang,
            };
        }
    }
    return item;
}

// Détection automatique des textes officiels et alertes flash (JORT, CGA, BCT, CTAF)
function detectRegulatoryFlash(title: string, description: string, source: string): { isFlash: boolean; flashType?: 'JORT' | 'CGA' | 'BCT' | 'CTAF' } {
    const text = (title + " " + (description || '')).toLowerCase();
    const isOfficialText = text.includes('décret') || text.includes('decret') || text.includes('circulaire') || text.includes('arrêté') || text.includes('arrete') || text.includes('loi n°') || text.includes('loi organique') || text.includes('décision') || text.includes('décision générale') || text.includes('منشور') || text.includes('مرسوم') || text.includes('قرار');

    if (source === 'JORT' || text.includes('jort') || text.includes('الرائد الرسمي')) {
        return { isFlash: true, flashType: 'JORT' };
    }
    if (source === 'CGA' || text.includes('cga') || text.includes('comité général des assurances') || text.includes('الهيئة العامة للتأمين')) {
        if (isOfficialText || text.includes('assurance') || text.includes('réforme') || text.includes('lcb-ft') || text.includes('règlement')) {
            return { isFlash: true, flashType: 'CGA' };
        }
    }
    if (source === 'BCT' || text.includes('banque centrale de tunisie') || text.includes('bct') || text.includes('البنك المركزي')) {
        if (isOfficialText || text.includes('circulaire')) {
            return { isFlash: true, flashType: 'BCT' };
        }
    }
    if (source === 'CTAF' || text.includes('ctaf') || text.includes('commission des analyses financières') || text.includes('لجنة التحاليل المالية')) {
        return { isFlash: true, flashType: 'CTAF' };
    }
    return { isFlash: false };
}

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
        'tunisie', 'tunisien', 'tunisienne', 'tunis', 'jort', 'bct', 'cga', 'ctaf', 'cmf', 'inpdp', 'juridoc', 'mae',
        'banque centrale', 'comité général des assurances', 'marché financier', 'loi tunisienne', 'dinar', 'carthage',
        'assurance tunisie', 'assurances tunisie', 'banque centrale de tunisie', 'الامتثال', 'التأمين', 'المركزي', 'تونس'
    ];

    const scoredNews = uniqueNews.map(item => {
        let score = new Date(item.date).getTime();
        const content = (item.title + " " + (item.description || '')).toLowerCase();
        let isTunisiaRelated = item.isHighPriority || item.country === 'TN';
        
        tunisiaKeywords.forEach(kw => {
            if (content.includes(kw.toLowerCase())) {
                isTunisiaRelated = true;
            }
        });

        if (item.source === 'Juridoc.tn' || item.source === 'CGA' || item.source === 'JORT' || item.source === 'BCT') {
            isTunisiaRelated = true;
        }

        const flash = detectRegulatoryFlash(item.title, item.description || '', item.source);
        if (flash.isFlash) {
            isTunisiaRelated = true;
            score += (24 * 60 * 60 * 1000 * 90); // Boost maximal pour les Flash officiels
        }

        const country = isTunisiaRelated ? 'TN' : (item.country || 'INTL');
        return { 
            ...item, 
            score, 
            isHighPriority: isTunisiaRelated, 
            country,
            isFlash: flash.isFlash,
            flashType: flash.flashType
        };
    });

    // 1. FLASH RÉGLEMENTAIRE TUNISIE (JORT / CGA / BCT / CTAF) en tête absolue
    // 2. PRIORISATION DES INFOS TUNISIE (Focus Tunisie)
    // 3. Classement chronologique décroissant au sein de chaque groupe
    scoredNews.sort((a, b) => {
        const flashA = a.isFlash ? 1 : 0;
        const flashB = b.isFlash ? 1 : 0;
        if (flashB !== flashA) {
            return flashB - flashA; // Flash JORT/CGA en tout premier !
        }
        const priorityA = a.isHighPriority ? 1 : 0;
        const priorityB = b.isHighPriority ? 1 : 0;
        if (priorityB !== priorityA) {
            return priorityB - priorityA; // Tunisie ensuite !
        }
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
    });

    // Traduction automatique vers le français pour les articles en anglais ou en arabe
    const candidates = scoredNews.slice(0, 35);
    const translatedResults = await Promise.allSettled(candidates.map(translateNewsItem));
    const finalizedNews: NewsItem[] = translatedResults.map((res, index) => {
        if (res.status === 'fulfilled') return res.value;
        return candidates[index];
    });

    return ComplianceNewsOutputSchema.parse(finalizedNews);
}

async function callGroqChatCompletion(prompt: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey) {
        console.error('[AI] Missing GROQ_API_KEY');
        return 'L\'assistant IA est temporairement indisponible (Clé API manquante).';
    }

    const model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

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
                    { 
                        role: 'system', 
                        content: `Tu es un assistant expert en conformité GRC et LCB-FT tunisienne et internationale. 
                        Ta mission est de fournir des briefings stratégiques basés sur les actualités mondiales en les interprétant à travers le prisme de la réglementation locale.
                        
                        BASE DE CONNAISSANCE RÉGLEMENTAIRE (RÉFÉRENCE) :
                        ${LEGAL_KNOWLEDGE_BASE}` 
                    },
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
