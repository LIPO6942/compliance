'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { analyzeEcosystemImage } from '@/lib/ecosystemAI';
import { EcosystemMap } from '@/types/compliance';
import { toast } from '@/components/hooks/use-toast';

interface EcosystemUploadProps {
    onValidated: (map: Omit<EcosystemMap, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function EcosystemUpload({ onValidated }: EcosystemUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);

        setIsUploading(true);
        try {
            toast({
                title: "Analyse en cours",
                description: "L'IA analyse la structure de votre image...",
            });

            const result = await analyzeEcosystemImage(URL.createObjectURL(file));
            onValidated(result);

            toast({
                title: "Analyse terminée",
                description: "La structure a été extraite avec succès.",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Erreur d'analyse",
                description: "Impossible d'interpréter l'image.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                {isUploading ? (
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                ) : (
                    <Upload className="h-10 w-10 text-slate-400" />
                )}
            </div>

            <div className="text-center space-y-1">
                <h3 className="text-lg font-bold">Importer une Cartographie</h3>
                <p className="text-sm text-slate-500">
                    Glissez une image (PNG/JPG) pour que l'IA la transforme en carte interactive.
                </p>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="outline" className="relative cursor-pointer" disabled={isUploading}>
                    <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    Choisir un fichier
                </Button>
            </div>

            {previewUrl && (
                <div className="mt-8 relative group">
                    <img src={previewUrl} alt="Preview" className="max-w-xs rounded-lg shadow-md border-2 border-white dark:border-slate-700" />
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 rounded-full h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setPreviewUrl(null)}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}
        </Card>
    );
}
