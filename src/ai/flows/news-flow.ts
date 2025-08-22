
'use server';

/**
 * @fileOverview A flow for fetching compliance news from a real news API, with an AI fallback.
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

const generateFallbackNewsPrompt = ai.definePrompt({
    name: 'generateFallbackNewsPrompt',
    input: { schema: z.void() },
    output: { schema: ComplianceNewsOutputSchema },
    prompt: `Tu es un expert en conformité financière. Génère une liste de 5 articles d'actualité fictifs mais réalistes sur la conformité pour un public français.
    Les sujets doivent inclure la LBA-FT, les nouvelles réglementations, et les sanctions internationales.
    Pour chaque article, fournis un titre, une source plausible (ex: 'Les Echos', 'Agefi', 'Reuters'), une date récente, et une courte description.
    Utilise le format JSON spécifié.`,
});


const fetchComplianceNewsFlow = ai.defineFlow(
  {
    name: 'fetchComplianceNewsFlow',
    inputSchema: z.void(),
    outputSchema: ComplianceNewsOutputSchema,
  },
  async () => {
    
    const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

    if (!GNEWS_API_KEY) {
      console.warn("[NEWS FLOW] Clé API GNews (GNEWS_API_KEY) non trouvée. Basculement vers le générateur IA.");
      const { output } = await generateFallbackNewsPrompt();
      return output ?? [];
    }
    
    try {
        const query = encodeURIComponent('"conformité assurance" OR "lutte anti-blanchiment"');
        const url = `https://gnews.io/api/v4/search?q=${query}&lang=fr,en&country=fr,be,ch,ca&topic=business&max=5&apikey=${GNEWS_API_KEY}`;
        
        console.log(`[NEWS FLOW] Fetching GNews with URL: ${url}`);
        const response = await fetch(url);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[NEWS FLOW] Erreur de l'API GNews. Statut: ${response.status}. Réponse: ${errorBody}. Basculement vers l'IA.`);
            const { output } = await generateFallbackNewsPrompt();
            return output ?? [];
        }

        const newsData = await response.json() as { articles?: any[] };

        if (!newsData.articles || newsData.articles.length === 0) {
           console.warn("[NEWS FLOW] GNews n'a retourné aucun article. Basculement vers l'IA.");
           const { output } = await generateFallbackNewsPrompt();
           return output ?? [];
        }

        console.log(`[NEWS FLOW] Reçu ${newsData.articles.length} articles de GNews.`);

        const transformedNews: NewsItem[] = newsData.articles
            .map((article: any, index: number): NewsItem | null => {
                if (!article || !article.title || !article.description || !article.url) {
                    console.warn('[NEWS FLOW] Article ignoré car il manque des champs essentiels:', article);
                    return null;
                }
                return {
                    id: article.url,
                    title: article.title,
                    date: new Date(article.publishedAt).toISOString().split('T')[0],
                    source: mapSourceToEnum(article.source?.name),
                    description: article.description,
                    url: article.url,
                    imageUrl: article.image || undefined,
                };
            })
            .filter((item): item is NewsItem => item !== null)
            .slice(0, 5);

        return transformedNews;

    } catch (error) {
        console.error("[NEWS FLOW] Erreur inattendue lors de la récupération des actualités. Basculement vers l'IA:", error);
        const { output } = await generateFallbackNewsPrompt();
        return output ?? [];
    }
  }
);
