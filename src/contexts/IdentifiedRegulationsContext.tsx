
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { IdentifiedRegulation, IdentifiedRegulationStatus, CategorizeRegulationOutput } from '@/types/compliance';
import type { AnalyzeRegulationResult } from '@/app/(app)/regulatory-watch/actions';

interface IdentifiedRegulationsContextType {
  identifiedRegulations: IdentifiedRegulation[];
  addIdentifiedRegulation: (
    originalText: string,
    keywords: string,
    analysis: AnalyzeRegulationResult
  ) => void;
  updateRegulationStatus: (regulationId: string, newStatus: IdentifiedRegulationStatus) => void;
}

const IdentifiedRegulationsContext = createContext<IdentifiedRegulationsContextType | undefined>(undefined);

export const IdentifiedRegulationsProvider = ({ children }: { children: ReactNode }) => {
  const [identifiedRegulations, setIdentifiedRegulations] = useState<IdentifiedRegulation[]>(() => {
    if (typeof window !== 'undefined') {
      const savedRegulations = localStorage.getItem('identifiedRegulations');
      return savedRegulations ? JSON.parse(savedRegulations) : [];
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('identifiedRegulations', JSON.stringify(identifiedRegulations));
    }
  }, [identifiedRegulations]);

  const addIdentifiedRegulation = (
    originalText: string,
    keywords: string,
    analysis: AnalyzeRegulationResult
  ) => {
    if (!analysis.inclusion) return; // Should not happen if called correctly

    const newRegulation: IdentifiedRegulation = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      regulationTextFull: originalText,
      regulationTextSummary: originalText.substring(0, 200) + (originalText.length > 200 ? '...' : ''),
      inclusionDecision: {
        include: analysis.inclusion.include,
        reason: analysis.inclusion.reason,
      },
      categorizationSuggestions: analysis.categorization,
      status: 'Nouvelle',
      keywordsUsed: keywords,
    };
    setIdentifiedRegulations(prev => [newRegulation, ...prev]);
  };

  const updateRegulationStatus = (regulationId: string, newStatus: IdentifiedRegulationStatus) => {
    setIdentifiedRegulations(prevRegulations =>
      prevRegulations.map(reg =>
        reg.id === regulationId ? { ...reg, status: newStatus } : reg
      )
    );
  };

  return (
    <IdentifiedRegulationsContext.Provider value={{ identifiedRegulations, addIdentifiedRegulation, updateRegulationStatus }}>
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
