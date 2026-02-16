
'use server';

import { z } from 'zod';
import { EcosystemMap, EcosystemNode, EcosystemEdge } from '@/types/compliance';

const EcosystemAnalysisOutputSchema = z.object({
    name: z.string(),
    nodes: z.array(z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(['authority', 'entity', 'judicial', 'service', 'other']),
        icon: z.string().optional(),
        position: z.object({ x: z.number(), y: z.number() }),
    })),
    edges: z.array(z.object({
        id: z.string(),
        source: z.string(),
        target: z.string(),
        label: z.string().optional(),
    })),
});

export type EcosystemAnalysisOutput = z.infer<typeof EcosystemAnalysisOutputSchema>;

export async function analyzeEcosystemImageFlow(base64Image: string): Promise<Omit<EcosystemMap, 'id' | 'createdAt' | 'updatedAt'>> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not configured');
    }

    const model = 'llama-3.2-90b-vision-preview';

    const prompt = `
    Tu es un expert en conformité et gestion des risques. 
    Analyse cette image qui représente une cartographie des acteurs ou un organigramme (LBA/FT, GRC).
    
    Ta mission est de TRANSCRIRE FIDÈLEMENT le contenu de l'image en une structure de nœuds et de liens.
    
    Règles d'extraction :
    1. Lis TOUT le texte visible dans les boîtes/formes.
    2. Identifie les flèches et les relations entre les boîtes.
    3. Estime la position relative (x, y) pour garder la même mise en page.
    
    Pour chaque nœud (node) :
    - id : un identifiant unique (ex: 'node1', 'node2')
    - label : le texte EXACT contenu dans la boîte
    - type : 'authority' (régulateur), 'entity' (assujetti), 'judicial' (justice), 'service' (tiers), ou 'other'.
    - position : { x: number, y: number } (échelle approx 0-800)
    
    Pour chaque lien (edge) :
    - id : unique (ex: 'edge1')
    - source : id du nœud de départ
    - target : id du nœud d'arrivée
    - label : texte sur la flèche (si présent)
    
    Réponds UNIQUEMENT avec ce JSON valide :
    {
      "name": "Titre détecté ou Cartographie",
      "nodes": [...],
      "edges": [...]
    }
  `;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`,
                                },
                            },
                        ],
                    },
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[GROQ VISION ERROR]', response.status, errorText);
            throw new Error(`Groq API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const parsed = JSON.parse(content);

        return EcosystemAnalysisOutputSchema.parse({
            ...parsed,
            section: 'general'
        }) as any;
    } catch (error) {
        console.error('[ECOSYSTEM ANALYSIS ERROR]', error);
        throw error;
    }
}
