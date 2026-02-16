import { EcosystemMap } from '@/types/compliance';
import { analyzeEcosystemAction } from '@/app/(app)/ecosystem/actions';

/**
 * Converts a File or Blob URL to a Base64 string.
 */
/**
 * Compresses and converts an image file to a Base64 string.
 * Resizes large images to max 1500px to avoid payload issues.
 */
async function compressAndConvertToBase64(fileUri: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Resize if too large
            const MAX_DIMENSION = 1500;
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * MAX_DIMENSION) / width);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width * MAX_DIMENSION) / height);
                    height = MAX_DIMENSION;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // White background for transparent PNGs
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to JPEG 0.8 quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
        img.src = fileUri;
    });
}

/**
 * Analyzes an image of an ecosystem and returns a structured map.
 * Calls the Groq-powered server action.
 */
export async function analyzeEcosystemImage(imageUri: string): Promise<Omit<EcosystemMap, 'id' | 'createdAt' | 'updatedAt'>> {
    try {
        // Convert and compress the image to base64 to send to the server action
        const base64Image = await compressAndConvertToBase64(imageUri);

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
