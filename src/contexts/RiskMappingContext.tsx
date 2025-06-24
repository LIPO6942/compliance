
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { RiskMappingItem } from '@/types/compliance';
import { initialMockRiskMapping } from '@/data/mockRiskMapping';

interface RiskMappingContextType {
  risks: RiskMappingItem[];
  addRisk: (risk: Omit<RiskMappingItem, 'id' | 'lastUpdated'>) => void;
  editRisk: (riskId: string, riskUpdate: Partial<Omit<RiskMappingItem, 'id' | 'lastUpdated'>>) => void;
  removeRisk: (riskId: string) => void;
}

const RiskMappingContext = createContext<RiskMappingContextType | undefined>(undefined);

export const RiskMappingProvider = ({ children }: { children: ReactNode }) => {
  const [risks, setRisks] = useState<RiskMappingItem[]>(() => {
    if (typeof window !== 'undefined') {
      const savedRisks = localStorage.getItem('riskMapping');
      try {
        const parsed = savedRisks ? JSON.parse(savedRisks) : initialMockRiskMapping;
        return Array.isArray(parsed) ? parsed : initialMockRiskMapping;
      } catch (error) {
        console.error("Failed to parse risks from localStorage", error);
        return initialMockRiskMapping;
      }
    }
    return initialMockRiskMapping;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('riskMapping', JSON.stringify(risks));
    }
  }, [risks]);

  const addRisk = (risk: Omit<RiskMappingItem, 'id' | 'lastUpdated'>) => {
    const newRisk: RiskMappingItem = {
      ...risk,
      id: Date.now().toString(),
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setRisks(prev => [newRisk, ...prev]);
  };

  const editRisk = (riskId: string, riskUpdate: Partial<Omit<RiskMappingItem, 'id' | 'lastUpdated'>>) => {
    setRisks(prev =>
      prev.map(risk =>
        risk.id === riskId
          ? { ...risk, ...riskUpdate, lastUpdated: new Date().toISOString().split('T')[0] }
          : risk
      )
    );
  };

  const removeRisk = (riskId: string) => {
    setRisks(prev => prev.filter(risk => risk.id !== riskId));
  };

  return (
    <RiskMappingContext.Provider value={{ risks, addRisk, editRisk, removeRisk }}>
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
