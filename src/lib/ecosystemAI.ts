import { EcosystemMap } from '@/types/compliance';
import { analyzeEcosystemAction } from '@/app/(app)/ecosystem/actions';

/**
 * Converts a File or Blob URL to a Base64 string.
 */
async function fileToBase64(fileUri: string): Promise<string> {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Analyzes an image of an ecosystem and returns a structured map.
 * Calls the Groq-powered server action.
 */
export async function analyzeEcosystemImage(imageUri: string): Promise<Omit<EcosystemMap, 'id' | 'createdAt' | 'updatedAt'>> {
    try {
        // Convert the image to base64 to send to the server action
        const base64Image = await fileToBase64(imageUri);

        const result = await analyzeEcosystemAction(base64Image);

        if (result.error || !result.map) {
            throw new Error(result.error || "L'analyse a échoué.");
        }

        return result.map;
    } catch (error) {
        console.error("[ECOSYSTEM AI LIB]", error);
        throw error;
    }
}
