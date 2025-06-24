
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { IdentifiedRegulation, RiskMappingItem, RiskLevel, AlertCriticality } from '@/types/compliance';

interface IdentifiedRegulationsContextType {
  identifiedRegulations: IdentifiedRegulation[];
  addIdentifiedRegulation: (
    originalText: string,
    keywords: string[],
    analysis: Record<string, string[]>
  ) => void;
  updateRegulation: (regulationId: string, updateData: Partial<Omit<IdentifiedRegulation, 'id'>>) => void;
  createAlertFromRisk: (risk: RiskMappingItem) => void;
}

const IdentifiedRegulationsContext = createContext<IdentifiedRegulationsContextType | undefined>(undefined);

export const IdentifiedRegulationsProvider = ({ children }: { children: ReactNode }) => {
  const [identifiedRegulations, setIdentifiedRegulations] = useState<IdentifiedRegulation[]>(() => {
    if (typeof window !== 'undefined') {
      const savedRegulations = localStorage.getItem('identifiedRegulations');
      try {
        const parsed = savedRegulations ? JSON.parse(savedRegulations) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error("Failed to parse identified regulations from localStorage", error);
        return [];
      }
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
    keywords: string[],
    analysis: Record<string, string[]>
  ) => {
    const newRegulation: IdentifiedRegulation = {
      id: Date.now().toString(),
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
    setIdentifiedRegulations(prev => [newRegulation, ...prev]);
  };
  
  const updateRegulation = (regulationId: string, updateData: Partial<Omit<IdentifiedRegulation, 'id'>>) => {
    setIdentifiedRegulations(prevRegulations =>
      prevRegulations.map(reg =>
        reg.id === regulationId ? { ...reg, ...updateData } : reg
      )
    );
  };
  
  const createAlertFromRisk = (risk: RiskMappingItem) => {
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

    const newAlert: IdentifiedRegulation = {
      id: `risk-${Date.now().toString()}`,
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

    setIdentifiedRegulations(prev => [newAlert, ...prev]);
  };


  return (
    <IdentifiedRegulationsContext.Provider value={{ identifiedRegulations, addIdentifiedRegulation, updateRegulation, createAlertFromRisk }}>
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
