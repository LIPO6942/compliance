
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

    const model = 'llama-3.2-11b-vision-preview';

    const prompt = `
    Tu es un expert en conformité et gestion des risques. 
    Analyse l'image fournie qui représente une cartographie des acteurs, un écosystème ou un organigramme lié à la conformité (LBA/FT, GRC, etc.).
    
    Extrais la structure sous forme de nœuds et de liens (edges).
    
    Pour chaque nœud :
    - id : un identifiant unique court (ex: 'cga', 'banque', 'ministere')
    - label : le nom complet du texte dans l'image
    - type : 'authority' (pour les régulateurs/autorités), 'entity' (pour les entreprises/banques), 'judicial' (procureur, tribunaux), 'service' (conseils, prestataires), ou 'other'.
    - position : estime des coordonnées x et y (entre 0 et 800) pour reproduire la disposition visuelle de l'image.
    
    Pour chaque lien (edge) :
    - id : un identifiant unique (ex: 'e1', 'e2')
    - source : l'id du nœud source
    - target : l'id du nœud cible
    - label : le texte sur la flèche ou la nature de la relation (ex: 'Rapports', 'Contrôle', 'Signalement').
    
    Réponds EXCLUSIVEMENT au format JSON valide selon cette structure :
    {
      "name": "Titre de la cartographie",
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
