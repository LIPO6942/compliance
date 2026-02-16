'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { EcosystemMap } from '@/types/compliance';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, collection, query, orderBy, deleteDoc } from 'firebase/firestore';

interface EcosystemContextType {
    ecosystems: EcosystemMap[];
    currentMap: EcosystemMap | null;
    currentMapId: string | null;
    loading: boolean;
    setCurrentMapId: (id: string | null) => void;
    saveEcosystemMap: (map: EcosystemMap) => Promise<void>;
    updateEcosystemMap: (id: string, update: Partial<EcosystemMap>) => Promise<void>;
    deleteEcosystemMap: (id: string) => Promise<void>;
    renameEcosystemMap: (id: string, newName: string) => Promise<void>;
}

const EcosystemContext = createContext<EcosystemContextType | undefined>(undefined);

export const EcosystemProvider = ({ children }: { children: ReactNode }) => {
    const [ecosystems, setEcosystems] = useState<EcosystemMap[]>([]);
    const [currentMapId, setCurrentMapId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isFirebaseConfigured || !db) {
            setLoading(false);
            return;
        }

        const ecosystemsRef = collection(db, 'ecosystems');
        const q = query(ecosystemsRef, orderBy('updatedAt', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const maps: EcosystemMap[] = [];
            querySnapshot.forEach((doc) => {
                maps.push(doc.data() as EcosystemMap);
            });
            setEcosystems(maps);

            // Set current map to the first one if not set or if current map was deleted
            if (maps.length > 0) {
                if (!currentMapId || !maps.find(m => m.id === currentMapId)) {
                    setCurrentMapId(maps[0].id);
                }
            } else {
                setCurrentMapId(null);
            }

            setLoading(false);
        }, (error) => {
            console.error("Error fetching ecosystem maps:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentMapId]);

    const currentMap = ecosystems.find(m => m.id === currentMapId) || null;

    const saveEcosystemMap = async (map: EcosystemMap) => {
        if (!db) return;
        const mapId = map.id || `map-${Date.now()}`;
        try {
            await setDoc(doc(db, 'ecosystems', mapId), {
                ...map,
                id: mapId,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            setCurrentMapId(mapId);
        } catch (error) {
            console.error("Error saving ecosystem map:", error);
            throw error;
        }
    };

    const updateEcosystemMap = async (id: string, update: Partial<EcosystemMap>) => {
        if (!db) return;
        try {
            const mapRef = doc(db, 'ecosystems', id);
            await updateDoc(mapRef, {
                ...update,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error updating ecosystem map:", error);
            throw error;
        }
    };

    const deleteEcosystemMap = async (id: string) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'ecosystems', id));
        } catch (error) {
            console.error("Error deleting ecosystem map:", error);
            throw error;
        }
    };

    const renameEcosystemMap = async (id: string, newName: string) => {
        await updateEcosystemMap(id, { name: newName });
    };

    return (
        <EcosystemContext.Provider value={{
            ecosystems,
            currentMap,
            currentMapId,
            loading,
            setCurrentMapId,
            saveEcosystemMap,
            updateEcosystemMap,
            deleteEcosystemMap,
            renameEcosystemMap
        }}>
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
