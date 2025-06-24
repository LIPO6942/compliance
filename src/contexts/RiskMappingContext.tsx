
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { RiskMappingItem } from '@/types/compliance';
import { initialMockRiskMapping } from '@/data/mockRiskMapping';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { useUser } from './UserContext';

const risksCollectionName = "riskMapping";

interface RiskMappingContextType {
  risks: RiskMappingItem[];
  loading: boolean;
  addRisk: (risk: Omit<RiskMappingItem, 'id' | 'lastUpdated'>) => Promise<void>;
  editRisk: (riskId: string, riskUpdate: Partial<Omit<RiskMappingItem, 'id' | 'lastUpdated'>>) => Promise<void>;
  removeRisk: (riskId: string) => Promise<void>;
}

const RiskMappingContext = createContext<RiskMappingContextType | undefined>(undefined);

export const RiskMappingProvider = ({ children }: { children: ReactNode }) => {
  const [risks, setRisks] = useState<RiskMappingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isFirebaseConfigured || !db) {
        setRisks(initialMockRiskMapping);
        setLoading(false);
        console.warn("Firebase is not configured. Risk mapping data will use mock data.");
        return;
    }

    const q = query(collection(db, risksCollectionName), orderBy("lastUpdated", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const risksData: RiskMappingItem[] = [];
      querySnapshot.forEach((doc) => {
        risksData.push({ id: doc.id, ...doc.data() } as RiskMappingItem);
      });
      setRisks(risksData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching risks, falling back to mock data: ", error);
      setRisks(initialMockRiskMapping);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isLoaded]);

  const addRisk = async (risk: Omit<RiskMappingItem, 'id' | 'lastUpdated'>) => {
    if (!isFirebaseConfigured || !db) return;
    const newRisk = {
      ...risk,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    await addDoc(collection(db, risksCollectionName), newRisk);
  };

  const editRisk = async (riskId: string, riskUpdate: Partial<Omit<RiskMappingItem, 'id' | 'lastUpdated'>>) => {
    if (!isFirebaseConfigured || !db) return;
    const docRef = doc(db, risksCollectionName, riskId);
    await updateDoc(docRef, {
      ...riskUpdate,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  };

  const removeRisk = async (riskId: string) => {
    if (!isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, risksCollectionName, riskId));
  };

  return (
    <RiskMappingContext.Provider value={{ risks, loading, addRisk, editRisk, removeRisk }}>
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
