
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { IdentifiedRegulation, RiskMappingItem, RiskLevel, AlertCriticality } from '@/types/compliance';
import { initialMockRegulations } from '@/data/mockRegulations';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, query, orderBy, writeBatch } from "firebase/firestore";
import { useUser } from './UserContext';

const regulationsCollectionName = "identifiedRegulations";

interface IdentifiedRegulationsContextType {
  identifiedRegulations: IdentifiedRegulation[];
  loading: boolean;
  addIdentifiedRegulation: (
    originalText: string,
    keywords: string[],
    analysis: Record<string, string[]>
  ) => Promise<void>;
  updateRegulation: (regulationId: string, updateData: Partial<Omit<IdentifiedRegulation, 'id'>>) => Promise<void>;
  createAlertFromRisk: (risk: RiskMappingItem) => Promise<void>;
}

const IdentifiedRegulationsContext = createContext<IdentifiedRegulationsContextType | undefined>(undefined);

export const IdentifiedRegulationsProvider = ({ children }: { children: ReactNode }) => {
  const [identifiedRegulations, setIdentifiedRegulations] = useState<IdentifiedRegulation[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isFirebaseConfigured || !db) {
        setIdentifiedRegulations(initialMockRegulations);
        setLoading(false);
        console.warn("Firebase is not configured. Regulations will use mock data.");
        return;
    }

    const q = query(collection(db, regulationsCollectionName), orderBy("publicationDate", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (querySnapshot.empty && loading) {
        console.log(`[${regulationsCollectionName}] collection is empty. Seeding with mock data.`);
        const batch = writeBatch(db!);
        initialMockRegulations.forEach((mockReg) => {
          const { id, ...data } = mockReg;
          const docRef = doc(collection(db!, regulationsCollectionName));
          batch.set(docRef, data);
        });
        batch.commit().catch(e => console.error(`Failed to seed ${regulationsCollectionName}:`, e));
        return;
      }
      
      const regulationsData: IdentifiedRegulation[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IdentifiedRegulation));
      setIdentifiedRegulations(regulationsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching regulations, falling back to mock data: ", error);
      setIdentifiedRegulations(initialMockRegulations);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isLoaded, loading]);

  const addIdentifiedRegulation = async (
    originalText: string,
    keywords: string[],
    analysis: Record<string, string[]>
  ) => {
    if (!isFirebaseConfigured || !db) return;
    const newRegulation: Omit<IdentifiedRegulation, 'id'> = {
      publicationDate: new Date().toISOString(),
      source: 'Veille IA',
      type: 'Nouvelle loi',
      summary: originalText.substring(0, 150) + (originalText.length > 150 ? '...' : ''),
      fullText: originalText,
      status: 'Nouveau',
      criticality: 'Moyenne',
      keywords: keywords,
      aiAnalysis: analysis,
      affectedDepartments: [],
      requiredActions: '',
      analysisNotes: '',
    };
    await addDoc(collection(db, regulationsCollectionName), newRegulation);
  };
  
  const updateRegulation = async (regulationId: string, updateData: Partial<Omit<IdentifiedRegulation, 'id'>>) => {
    if (!isFirebaseConfigured || !db) return;
    const docRef = doc(db, regulationsCollectionName, regulationId);
    await updateDoc(docRef, updateData);
  };
  
  const createAlertFromRisk = async (risk: RiskMappingItem) => {
    if (!isFirebaseConfigured || !db) return;
    const mapRiskLevelToCriticality = (riskLevel: RiskLevel): AlertCriticality => {
      switch (riskLevel) {
        case 'Critique':
        case 'Important':
          return 'Haute';
        case 'Modéré':
          return 'Moyenne';
        case 'Faible':
          return 'Basse';
        default:
          return 'Moyenne';
      }
    };

    const newAlert: Omit<IdentifiedRegulation, 'id'> = {
      publicationDate: new Date().toISOString(),
      source: 'Cartographie des Risques',
      type: 'Risque Interne',
      summary: `Risque: ${risk.riskDescription.substring(0, 100)}${risk.riskDescription.length > 100 ? '...' : ''}`,
      fullText: `Direction: ${risk.department}\nSujet: ${risk.monitoringSubject}\nDescription: ${risk.riskDescription}\nAction attendue: ${risk.expectedAction}`,
      status: 'Nouveau',
      criticality: mapRiskLevelToCriticality(risk.riskLevel),
      affectedDepartments: [risk.department],
      requiredActions: risk.expectedAction,
      analysisNotes: `Alerte générée à partir de la cartographie des risques (ID: ${risk.id}).\nPropriétaire du risque: ${risk.owner}`,
      keywords: [],
      aiAnalysis: {},
    };

    await addDoc(collection(db, regulationsCollectionName), newAlert);
  };

  return (
    <IdentifiedRegulationsContext.Provider value={{ identifiedRegulations, loading, addIdentifiedRegulation, updateRegulation, createAlertFromRisk }}>
      {children}
    </IdentifiedRegulationsContext.Provider>
  );
};

export const useIdentifiedRegulations = () => {
  const context = useContext(IdentifiedRegulationsContext);
  if (context === undefined) {
    throw new Error('useIdentifiedRegulations must be used within an IdentifiedRegulationsProvider');
  }
  return context;
};
