'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import {
    DeviceAuthRequest,
    listenToPendingDeviceRequests,
    fetchPendingDeviceRequests,
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
import { Smartphone, Check, X, Loader2, ShieldCheck, BellRing, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const DeviceApprovalModal = () => {
    const { user } = useUser();
    const { toast } = useToast();
    const [pendingRequests, setPendingRequests] = useState<DeviceAuthRequest[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(true);

    useEffect(() => {
        // Initial fetch
        fetchPendingDeviceRequests().then((reqs) => {
            if (reqs.length > 0) {
                setPendingRequests(reqs);
                setModalOpen(true);
            }
        });

        // Real-time listener for any incoming device request in the workspace
        const unsubscribe = listenToPendingDeviceRequests((requests) => {
            setPendingRequests(requests);
            if (requests.length > 0) {
                setModalOpen(true);
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    if (pendingRequests.length === 0) return null;

    const currentRequest = pendingRequests[0];

    const handleApprove = async (req: DeviceAuthRequest) => {
        setProcessingId(req.id);
        try {
            await approveDeviceRequest(req, user?.email || user?.name || 'Poste Connecté');
            toast({
                title: "✅ Appareil autorisé avec succès !",
                description: `${req.deviceName} est désormais connecté et vérifié.`,
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
        <>
            {/* 1. Persistent Top Floating Alert Banner (Impossible to miss) */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-2xl animate-in slide-in-from-top-4 duration-300">
                <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border-2 border-amber-500/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center flex-shrink-0 animate-bounce">
                            <Smartphone className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5 text-left">
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-white">Demande de connexion</span>
                                <span className="bg-amber-500 text-slate-900 text-[10px] font-black px-2 py-0.2 rounded-full uppercase">
                                    Nouveau
                                </span>
                            </div>
                            <p className="text-xs text-slate-300">
                                <strong className="text-amber-300">{currentRequest.targetName}</strong> ({currentRequest.deviceName}) — Code : <span className="font-mono font-bold text-amber-400">{currentRequest.pinCode}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold rounded-xl h-9"
                            onClick={() => handleReject(currentRequest)}
                            disabled={processingId !== null}
                        >
                            <X className="mr-1 h-3.5 w-3.5" />
                            Refuser
                        </Button>

                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl h-9 px-4 shadow-lg shadow-emerald-900/40"
                            onClick={() => handleApprove(currentRequest)}
                            disabled={processingId !== null}
                        >
                            {processingId === currentRequest.id ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Check className="mr-1.5 h-4 w-4" />
                            )}
                            Autoriser cet appareil
                        </Button>
                    </div>
                </div>
            </div>

            {/* 2. Modal Dialog with details */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-md rounded-3xl p-6 border-2 border-primary/20 shadow-2xl animate-in zoom-in-95 duration-200">
                    <DialogHeader className="text-center pt-2">
                        <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                            <ShieldCheck className="h-8 w-8 animate-pulse" />
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                            Autoriser un nouvel appareil
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 font-medium text-xs px-2 pt-1">
                            Une tentative de connexion a été initiée depuis un téléphone pour le compte de <strong className="text-slate-900">{currentRequest.targetName}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-500">Appareil :</span>
                            <span className="font-bold text-slate-900">{currentRequest.deviceName}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-500">Compte ciblé :</span>
                            <span className="font-bold text-primary">{currentRequest.targetEmail}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                            <span className="font-semibold text-slate-500">Code de sécurité :</span>
                            <span className="font-mono font-black text-base bg-amber-100 text-amber-900 border border-amber-300 px-3 py-0.5 rounded-lg tracking-widest">
                                {currentRequest.pinCode}
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-400 pt-1 text-center">
                            En cliquant sur « Autoriser », cet appareil sera mémorisé comme appareil de confiance et pourra se reconnecter librement.
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button
                            variant="outline"
                            className="w-full sm:w-1/2 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 h-11"
                            onClick={() => handleReject(currentRequest)}
                            disabled={processingId !== null}
                        >
                            <X className="mr-1.5 h-4 w-4" />
                            Refuser
                        </Button>
                        <Button
                            className="w-full sm:w-1/2 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 h-11"
                            onClick={() => handleApprove(currentRequest)}
                            disabled={processingId !== null}
                        >
                            {processingId === currentRequest.id ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="mr-1.5 h-4 w-4" />
                            )}
                            Autoriser l'accès
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
