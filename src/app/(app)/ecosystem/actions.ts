
'use server';

import { analyzeEcosystemImageFlow } from '@/ai/flows/ecosystem-analysis';
import { EcosystemMap } from '@/types/compliance';

export interface EcosystemAnalysisResult {
    map?: Omit<EcosystemMap, 'id' | 'createdAt' | 'updatedAt'>;
    error?: string;
}

export async function analyzeEcosystemAction(base64Image: string): Promise<EcosystemAnalysisResult> {
    try {
        const result = await analyzeEcosystemImageFlow(base64Image);
        return { map: result };
    } catch (error) {
        console.error('Error in analyzeEcosystemAction:', error);
        return {
            error: error instanceof Error ? error.message : 'An unknown error occurred during AI analysis.'
        };
    }
}
