
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { RiskMappingItem } from '@/types/compliance';
import { initialMockRiskMapping } from '@/data/mockRiskMapping';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, orderBy, writeBatch, setDoc, getDoc } from "firebase/firestore";
import { useUser } from './UserContext';

const risksCollectionName = "riskMapping";
const metaDocPath = "riskMappingMeta/global";

interface RiskMappingContextType {
  risks: RiskMappingItem[];
  loading: boolean;
  globalDocumentIds: string[];
  maePositions: Record<number, string>;
  setGlobalDocumentIds: (ids: string[]) => Promise<void>;
  updateMaePosition: (level: number, text: string) => Promise<void>;
  addRisk: (risk: Omit<RiskMappingItem, 'id' | 'lastUpdated' | 'createdAt' | 'planActionLastUpdated' | 'planActionCreatedAt' | 'dmrLastUpdated' | 'dmrCreatedAt'>) => Promise<void>;
  editRisk: (riskId: string, riskUpdate: Partial<Omit<RiskMappingItem, 'id' | 'lastUpdated' | 'createdAt' | 'planActionLastUpdated' | 'planActionCreatedAt' | 'dmrLastUpdated' | 'dmrCreatedAt'>>) => Promise<void>;
  removeRisk: (riskId: string) => Promise<void>;
}

const defaultMaePositions: Record<number, string> = {
  1: "Accepté – contrôles standards",
  2: "Accepté sous conditions – contrôles renforcés",
  3: "Tolérance très limitée – validation Direction Générale",
  4: "Acceptable uniquement suite à dérogation légale validée par l'organe de gouvernance",
};

const RiskMappingContext = createContext<RiskMappingContextType | undefined>(undefined);

export const RiskMappingProvider = ({ children }: { children: ReactNode }) => {
  const [risks, setRisks] = useState<RiskMappingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalDocumentIds, setGlobalDocumentIdsState] = useState<string[]>([]);
  const [maePositions, setMaePositionsState] = useState<Record<number, string>>(defaultMaePositions);
  const { isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isFirebaseConfigured || !db) {
      setRisks(initialMockRiskMapping);
      setLoading(false);
      console.warn("Firebase is not configured. Risk mapping data will use mock data.");
      return;
    }

    // Listen for global meta (document IDs and MAE positions)
    const metaRef = doc(db, metaDocPath);
    const unsubMeta = onSnapshot(metaRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGlobalDocumentIdsState(data.documentIds || []);
        if (data.maePositions) {
          setMaePositionsState(data.maePositions);
        }
      }
    }, (error) => {
      console.error("Error fetching risk mapping metadata:", error);
    });

    const q = query(collection(db, risksCollectionName), orderBy("lastUpdated", "desc"));
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const dbRisks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RiskMappingItem));

      // Only seed when the collection is completely empty (first-time setup).
      if (querySnapshot.empty) {
        console.log(`[${risksCollectionName}] collection is empty. Initial seeding with default data.`);
        const batch = writeBatch(db!);

        initialMockRiskMapping.forEach((mockRisk) => {
          const { id, ...data } = mockRisk;
          const docRef = doc(collection(db!, risksCollectionName));
          batch.set(docRef, data);
        });

        await batch.commit().catch(e => console.error(`Failed to seed ${risksCollectionName}:`, e));
        return; // Snapshot listener will re-run with new data
      }

      setRisks(dbRisks);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching risks, falling back to mock data: ", error);
      setRisks(initialMockRiskMapping);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubMeta();
    };
  }, [isLoaded]);

  const setGlobalDocumentIds = async (ids: string[]) => {
    setGlobalDocumentIdsState(ids);
    if (!isFirebaseConfigured || !db) return;
    const metaRef = doc(db, metaDocPath);
    await setDoc(metaRef, { documentIds: ids }, { merge: true });
  };

  const updateMaePosition = async (level: number, text: string) => {
    const newPositions = { ...maePositions, [level]: text };
    setMaePositionsState(newPositions);
    if (!isFirebaseConfigured || !db) return;
    const metaRef = doc(db, metaDocPath);
    await setDoc(metaRef, { maePositions: newPositions }, { merge: true });
  };

  const addRisk = async (risk: Omit<RiskMappingItem, 'id' | 'lastUpdated' | 'createdAt' | 'planActionLastUpdated' | 'planActionCreatedAt' | 'dmrLastUpdated' | 'dmrCreatedAt'>) => {
    const cleanRisk = Object.fromEntries(
      Object.entries(risk).filter(([, value]) => value !== undefined)
    );
    const today = new Date().toISOString().split('T')[0];
    const newRisk: RiskMappingItem = {
      id: `risk_${Date.now()}`,
      ...cleanRisk,
      createdAt: today,
      lastUpdated: today,
      planActionCreatedAt: today,
      planActionLastUpdated: today,
      dmrCreatedAt: today,
      dmrLastUpdated: today,
    } as RiskMappingItem;

    setRisks((prev) => [newRisk, ...prev]);

    if (!isFirebaseConfigured || !db) return;
    await addDoc(collection(db, risksCollectionName), newRisk);
  };

  const editRisk = async (riskId: string, riskUpdate: Partial<Omit<RiskMappingItem, 'id' | 'lastUpdated' | 'createdAt' | 'planActionLastUpdated' | 'planActionCreatedAt' | 'dmrLastUpdated' | 'dmrCreatedAt'>>) => {
    const ctafFields = ['ctafClassification', 'ctafNotifRef', 'ctafComment'];

    const cleanUpdate = Object.fromEntries(
      Object.entries(riskUpdate).filter(([key, value]) => {
        if (ctafFields.includes(key)) return true;
        return value !== undefined;
      }).map(([key, value]) => {
        if (ctafFields.includes(key) && value === undefined) return [key, null];
        return [key, value];
      })
    );

    const planActionFields = ['weaknessPoint', 'actionCorrective', 'deadline', 'responsible', 'completionLevel'];
    const dmrFields = ['dmrEfficiency', 'dmrProbability', 'justification', 'maePosition'];

    const today = new Date().toISOString().split('T')[0];
    const updates: Record<string, unknown> = { ...cleanUpdate };

    const hasPlanActionUpdate = Object.keys(cleanUpdate).some(key => planActionFields.includes(key));
    const hasDmrUpdate = Object.keys(cleanUpdate).some(key => dmrFields.includes(key));
    const hasCtafUpdate = Object.keys(cleanUpdate).some(key => ctafFields.includes(key));

    if (hasPlanActionUpdate) {
      updates.planActionLastUpdated = today;
    }
    if (hasDmrUpdate) {
      updates.dmrLastUpdated = today;
    }
    if (!hasPlanActionUpdate && !hasDmrUpdate) {
      updates.lastUpdated = today;
    }
    if (hasCtafUpdate) {
      updates.lastUpdated = today;
    }

    setRisks((prev) =>
      prev.map((r) => (r.id === riskId ? ({ ...r, ...updates } as RiskMappingItem) : r))
    );

    if (!isFirebaseConfigured || !db) return;
    const docRef = doc(db, risksCollectionName, riskId);
    await updateDoc(docRef, updates);
  };

  const removeRisk = async (riskId: string) => {
    setRisks((prev) => prev.filter((r) => r.id !== riskId));

    if (!isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, risksCollectionName, riskId));
  };

  return (
    <RiskMappingContext.Provider value={{ risks, loading, globalDocumentIds, maePositions, setGlobalDocumentIds, updateMaePosition, addRisk, editRisk, removeRisk }}>
      {children}
    </RiskMappingContext.Provider>
  );
};

export const useRiskMapping = () => {
  const context = useContext(RiskMappingContext);
  if (context === undefined) {
    throw new Error('useRiskMapping must be used within a RiskMappingProvider');
  }
  return context;
};
