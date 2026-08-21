'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import {
    DeviceAuthRequest,
    listenToPendingDeviceRequests,
    approveDeviceRequest,
    rejectDeviceRequest
} from '@/lib/deviceApprovalService';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Smartphone, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const DeviceApprovalModal = () => {
    const { user } = useUser();
    const { toast } = useToast();
    const [pendingRequests, setPendingRequests] = useState<DeviceAuthRequest[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.email) return;

        // Listen for device requests targeting this user's primary or secondary emails
        const emailsToWatch = [
            user.email,
            user.authEmail,
            user.email === 'moslem@compliancenav.com' ? 'moslem.gouia@mae.tn' : null,
            user.email === 'moslem.gouia@mae.tn' ? 'moslem@compliancenav.com' : null,
        ].filter(Boolean) as string[];

        const unsubs: (() => void)[] = [];

        emailsToWatch.forEach((email) => {
            const unsub = listenToPendingDeviceRequests(email, (requests) => {
                setPendingRequests((prev) => {
                    const combined = [...prev.filter(r => r.targetEmail !== email), ...requests];
                    return combined;
                });
            });
            unsubs.push(unsub);
        });

        return () => {
            unsubs.forEach(u => u());
        };
    }, [user?.email, user?.authEmail]);

    if (pendingRequests.length === 0) return null;

    const currentRequest = pendingRequests[0];

    const handleApprove = async (req: DeviceAuthRequest) => {
        setProcessingId(req.id);
        try {
            await approveDeviceRequest(req, user?.email || 'Admin');
            toast({
                title: "Appareil autorisé avec succès",
                description: `${req.deviceName} peut désormais se connecter librement.`,
            });
            setPendingRequests(prev => prev.filter(r => r.id !== req.id));
        } catch (err: any) {
            toast({
                title: "Erreur lors de l'approbation",
                description: err?.message || "Impossible d'approuver l'appareil.",
                variant: "destructive"
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (req: DeviceAuthRequest) => {
        setProcessingId(req.id);
        try {
            await rejectDeviceRequest(req.id);
            toast({
                title: "Demande refusée",
                description: `L'appareil ${req.deviceName} a été rejeté.`,
            });
            setPendingRequests(prev => prev.filter(r => r.id !== req.id));
        } catch (err) {
            // ignore
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent className="max-w-md rounded-3xl p-6 border-2 border-primary/20 shadow-2xl animate-in zoom-in-95 duration-200">
                <DialogHeader className="text-center pt-2">
                    <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 text-primary animate-pulse">
                        <Smartphone className="h-7 w-7" />
                    </div>
                    <DialogTitle className="text-xl font-black tracking-tight">
                        Nouvel appareil détecté
                    </DialogTitle>
                    <DialogDescription className="text-slate-600 font-medium text-xs px-2 pt-1">
                        Un appareil tente de se connecter pour la 1ère fois au compte de <strong className="text-slate-900">{currentRequest.targetName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="my-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-500">Appareil :</span>
                        <span className="font-bold text-slate-900">{currentRequest.deviceName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-500">Code de sécurité :</span>
                        <span className="font-mono font-black text-sm bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg tracking-widest">
                            {currentRequest.pinCode}
                        </span>
                    </div>
                    <div className="text-[11px] text-slate-400 border-t border-slate-200 pt-2 text-center">
                        Validez si le code correspond à celui affiché sur votre téléphone.
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                        variant="outline"
                        className="w-full sm:w-1/2 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                        onClick={() => handleReject(currentRequest)}
                        disabled={processingId !== null}
                    >
                        <X className="mr-1.5 h-4 w-4" />
                        Refuser
                    </Button>
                    <Button
                        className="w-full sm:w-1/2 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                        onClick={() => handleApprove(currentRequest)}
                        disabled={processingId !== null}
                    >
                        {processingId === currentRequest.id ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="mr-1.5 h-4 w-4" />
                        )}
                        Autoriser
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
