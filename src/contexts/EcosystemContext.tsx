'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { EcosystemMap } from '@/types/compliance';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

interface EcosystemContextType {
    ecosystemMap: EcosystemMap | null;
    loading: boolean;
    saveEcosystemMap: (map: EcosystemMap) => Promise<void>;
    updateEcosystemMap: (update: Partial<EcosystemMap>) => Promise<void>;
}

const EcosystemContext = createContext<EcosystemContextType | undefined>(undefined);

export const EcosystemProvider = ({ children }: { children: ReactNode }) => {
    const [ecosystemMap, setEcosystemMap] = useState<EcosystemMap | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isFirebaseConfigured || !db) {
            setLoading(false);
            return;
        }

        // For now we use a single main ecosystem map
        const mapDocRef = doc(db, 'ecosystems', 'main');

        const unsubscribe = onSnapshot(mapDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setEcosystemMap(docSnap.data() as EcosystemMap);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching ecosystem map:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const saveEcosystemMap = async (map: EcosystemMap) => {
        if (!db) return;
        try {
            await setDoc(doc(db, 'ecosystems', map.id || 'main'), {
                ...map,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            console.error("Error saving ecosystem map:", error);
            throw error;
        }
    };

    const updateEcosystemMap = async (update: Partial<EcosystemMap>) => {
        if (!db || !ecosystemMap) return;
        try {
            const mapRef = doc(db, 'ecosystems', ecosystemMap.id || 'main');
            await updateDoc(mapRef, {
                ...update,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error updating ecosystem map:", error);
            throw error;
        }
    };

    return (
        <EcosystemContext.Provider value={{ ecosystemMap, loading, saveEcosystemMap, updateEcosystemMap }}>
            {children}
        </EcosystemContext.Provider>
    );
};

export const useEcosystem = () => {
    const context = useContext(EcosystemContext);
    if (context === undefined) {
        throw new Error('useEcosystem must be used within an EcosystemProvider');
    }
    return context;
};
