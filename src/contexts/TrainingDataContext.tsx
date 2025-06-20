
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { TrainingRegistryItem } from '@/types/compliance';

// Initial mock data, will be replaced by localStorage or empty array
const initialTrainingRegistryMock: TrainingRegistryItem[] = [
  { id: "reg001", title: "Principes Fondamentaux de la LAB-FT", objective: "Comprendre les mécanismes de LCB-FT et les obligations réglementaires.", duration: "2h", support: "Présentation PPT, Quiz", lastUpdated: "2024-06-01" },
  { id: "reg002", title: "Application du RGPD en Entreprise", objective: "Maîtriser les règles de protection des données personnelles.", duration: "3h", support: "Vidéo, Études de cas", lastUpdated: "2024-05-15" },
  { id: "reg003", title: "Code de Conduite et Éthique Professionnelle", objective: "Adopter les bons comportements et respecter les règles déontologiques.", duration: "1.5h", support: "Manuel, Scénarios", lastUpdated: "2024-07-01" },
];

interface TrainingDataContextType {
  trainingRegistryItems: TrainingRegistryItem[];
  addTrainingRegistryItem: (item: Omit<TrainingRegistryItem, 'id' | 'lastUpdated'>) => void;
  editTrainingRegistryItem: (itemId: string, itemUpdate: Partial<Omit<TrainingRegistryItem, 'id' | 'lastUpdated'>>) => void;
  removeTrainingRegistryItem: (itemId: string) => void;
}

const TrainingDataContext = createContext<TrainingDataContextType | undefined>(undefined);

export const TrainingDataProvider = ({ children }: { children: ReactNode }) => {
  const [trainingRegistryItems, setTrainingRegistryItems] = useState<TrainingRegistryItem[]>(() => {
    if (typeof window !== 'undefined') {
      const savedItems = localStorage.getItem('trainingRegistryItems');
      return savedItems ? JSON.parse(savedItems) : initialTrainingRegistryMock;
    }
    return initialTrainingRegistryMock;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trainingRegistryItems', JSON.stringify(trainingRegistryItems));
    }
  }, [trainingRegistryItems]);

  const addTrainingRegistryItem = (item: Omit<TrainingRegistryItem, 'id' | 'lastUpdated'>) => {
    const newItem: TrainingRegistryItem = {
      ...item,
      id: Date.now().toString(),
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setTrainingRegistryItems(prevItems => [newItem, ...prevItems]);
  };

  const editTrainingRegistryItem = (itemId: string, itemUpdate: Partial<Omit<TrainingRegistryItem, 'id' | 'lastUpdated'>>) => {
    setTrainingRegistryItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, ...itemUpdate, lastUpdated: new Date().toISOString().split('T')[0] } : item
      )
    );
  };

  const removeTrainingRegistryItem = (itemId: string) => {
    setTrainingRegistryItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  return (
    <TrainingDataContext.Provider value={{ trainingRegistryItems, addTrainingRegistryItem, editTrainingRegistryItem, removeTrainingRegistryItem }}>
      {children}
    </TrainingDataContext.Provider>
  );
};

export const useTrainingData = () => {
  const context = useContext(TrainingDataContext);
  if (context === undefined) {
    throw new Error('useTrainingData must be used within a TrainingDataProvider');
  }
  return context;
};
