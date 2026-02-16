import { EcosystemMap, EcosystemNode, EcosystemEdge } from '@/types/compliance';

/**
 * Simulates the AI process of converting an image to a structured ecosystem map.
 * In a real-world scenario, this would send the image to a Vision API.
 */
export async function analyzeEcosystemImage(imageUri: string): Promise<Omit<EcosystemMap, 'id' | 'createdAt' | 'updatedAt'>> {
    // We simulate a delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Mock data based on the provided image structure
    const nodes: EcosystemNode[] = [
        { id: 'minister', label: 'Ministre des Finances', type: 'authority', icon: 'Building2', position: { x: 400, y: 0 } },
        { id: 'cga', label: 'CGA (Autorité de Tutelle)', type: 'authority', icon: 'ShieldCheck', position: { x: 400, y: 150 } },
        { id: 'entities', label: 'Entités Assujetties', type: 'entity', icon: 'Building', position: { x: 400, y: 300 } },
        { id: 'ctaf', label: 'CTAF (CRF)', type: 'authority', icon: 'Search', position: { x: 200, y: 450 } },
        { id: 'cnlct', label: 'CNLCT', type: 'authority', icon: 'ShieldAlert', position: { x: 600, y: 450 } },
        { id: 'procureur', label: 'Procureur (Judiciaire)', type: 'judicial', icon: 'Gavel', position: { x: 100, y: 600 } },
        { id: 'other_national', label: 'Autres Autorités Nationales', type: 'authority', icon: 'Users', position: { x: 350, y: 600 } },
        { id: 'other_financial', label: 'Autres Autorités Financières', type: 'authority', icon: 'TrendingUp', position: { x: 800, y: 300 } },
    ];

    const edges: EcosystemEdge[] = [
        { id: 'e1', source: 'minister', target: 'cga', label: 'Rapports/Avis' },
        { id: 'e2', source: 'cga', target: 'entities', label: 'Lignes Directrices' },
        { id: 'e3', source: 'entities', target: 'cga', label: 'Rapports/Statistiques' },
        { id: 'e4', source: 'cga', target: 'other_financial', label: 'Coopération' },
        { id: 'e5', source: 'entities', target: 'ctaf', label: 'Déclarations de Soupçon' },
        { id: 'e6', source: 'entities', target: 'cnlct', label: 'Gel des Avoirs' },
        { id: 'e7', source: 'ctaf', target: 'procureur', label: 'Analyse confirmée' },
        { id: 'e8', source: 'ctaf', target: 'other_national', label: 'Coordination' },
    ];

    return {
        name: `Cartographie des Acteurs (Auto-${new Date().toLocaleTimeString()})`,
        section: "general",
        nodes,
        edges
    };
}
