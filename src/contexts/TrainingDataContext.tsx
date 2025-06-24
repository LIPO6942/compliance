
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { TrainingRegistryItem, UpcomingSession, SensitizationCampaign, CompletionCriterion } from '@/types/compliance';

// Helper function to calculate progress for UpcomingSession
const calculateSessionProgress = (session: Partial<Pick<UpcomingSession, 'logisticsConfirmed' | 'materialsPrepared' | 'invitationsSent'>>) => {
  let completedCriteria = 0;
  const totalCriteria = 3;
  if (session.logisticsConfirmed) completedCriteria++;
  if (session.materialsPrepared) completedCriteria++;
  if (session.invitationsSent) completedCriteria++;
  return Math.round((completedCriteria / totalCriteria) * 100);
};

// Generic helper function to calculate progress from a list of criteria
const calculateProgressFromCriteria = (criteria: CompletionCriterion[] = []) => {
  if (criteria.length === 0) return 0;
  const completedCount = criteria.filter(c => c.isCompleted).length;
  return Math.round((completedCount / criteria.length) * 100);
};

// Initial mock data
const initialTrainingRegistryMock: TrainingRegistryItem[] = [
  { 
    id: "reg001", 
    title: "Principes Fondamentaux de la LAB-FT", 
    objective: "Comprendre les mécanismes de LCB-FT et les obligations réglementaires.", 
    duration: "2h", 
    support: "Présentation PPT, Quiz", 
    lastUpdated: "2024-06-01", 
    completionCriteria: [
      { id: 'crit-reg001-1', text: 'Contenu revu récemment', isCompleted: true },
      { id: 'crit-reg001-2', text: 'Évaluation post-formation disponible', isCompleted: true },
      { id: 'crit-reg001-3', text: 'Mécanisme de feedback en place', isCompleted: false }
    ],
    successRate: 95, 
    progress: calculateProgressFromCriteria([
      { id: 'crit-reg001-1', text: 'Contenu revu récemment', isCompleted: true },
      { id: 'crit-reg001-2', text: 'Évaluation post-formation disponible', isCompleted: true },
      { id: 'crit-reg001-3', text: 'Mécanisme de feedback en place', isCompleted: false }
    ]) 
  },
  { 
    id: "reg002", 
    title: "Application du RGPD en Entreprise", 
    objective: "Maîtriser les règles de protection des données personnelles.", 
    duration: "3h", 
    support: "Vidéo, Études de cas", 
    lastUpdated: "2024-05-15",
    completionCriteria: [
      { id: 'crit-reg002-1', text: 'Contenu revu récemment', isCompleted: false },
      { id: 'crit-reg002-2', text: 'Évaluation post-formation disponible', isCompleted: true },
      { id: 'crit-reg002-3', text: 'Mécanisme de feedback en place', isCompleted: true }
    ],
    successRate: 88, 
    progress: calculateProgressFromCriteria([
      { id: 'crit-reg002-1', text: 'Contenu revu récemment', isCompleted: false },
      { id: 'crit-reg002-2', text: 'Évaluation post-formation disponible', isCompleted: true },
      { id: 'crit-reg002-3', text: 'Mécanisme de feedback en place', isCompleted: true }
    ]) 
  },
  { 
    id: "reg003", 
    title: "Code de Conduite et Éthique Professionnelle", 
    objective: "Adopter les bons comportements et respecter les règles déontologiques.", 
    duration: "1.5h", 
    support: "Manuel, Scénarios", 
    lastUpdated: "2024-07-01",
    completionCriteria: [
      { id: 'crit-reg003-1', text: 'Contenu revu récemment', isCompleted: true },
      { id: 'crit-reg003-2', text: 'Évaluation post-formation disponible', isCompleted: false },
      { id: 'crit-reg003-3', text: 'Mécanisme de feedback en place', isCompleted: false }
    ],
    progress: calculateProgressFromCriteria([
      { id: 'crit-reg003-1', text: 'Contenu revu récemment', isCompleted: true },
      { id: 'crit-reg003-2', text: 'Évaluation post-formation disponible', isCompleted: false },
      { id: 'crit-reg003-3', text: 'Mécanisme de feedback en place', isCompleted: false }
    ])
  },
];

const initialUpcomingSessionsMock: UpcomingSession[] = [
  { id: "sess001", title: "Formation LAB-FT (Recyclage)", date: "2024-09-15", type: "Obligatoire", department: "Tous", logisticsConfirmed: true, materialsPrepared: true, invitationsSent: false, isCompleted: false, participants: 0, totalInvitees: 50, progress: calculateSessionProgress({logisticsConfirmed: true, materialsPrepared: true, invitationsSent: false}) },
  { id: "sess002", title: "Nouveautés RGPD et Impact Opérationnel", date: "2024-10-05", type: "Recommandée", department: "Marketing, IT", logisticsConfirmed: false, materialsPrepared: true, invitationsSent: true, isCompleted: false, participants: 0, totalInvitees: 25, progress: calculateSessionProgress({logisticsConfirmed: false, materialsPrepared: true, invitationsSent: true}) },
  { id: "sess003", title: "Sensibilisation à la Déontologie Financière", date: "2024-06-20", type: "Obligatoire", department: "Finance, Vente", logisticsConfirmed: true, materialsPrepared: true, invitationsSent: true, isCompleted: true, participants: 18, totalInvitees: 20, progress: calculateSessionProgress({logisticsConfirmed: true, materialsPrepared: true, invitationsSent: true}) },
];

const initialSensitizationCampaignsMock: SensitizationCampaign[] = [
    { 
      id: "camp001", name: "LAB-FT", status: "En cours", launchDate: "2024-07-10", target: "Commerciaux, Middle Office",
      completionCriteria: [
        { id: 'camp001-crit1', text: 'Procédures KYC/KYB mises à jour', isCompleted: true },
        { id: 'camp001-crit2', text: 'Surveillance des transactions renforcée', isCompleted: true },
        { id: 'camp001-crit3', text: 'Personnel formé aux signaux d\'alerte', isCompleted: false },
      ],
      progress: calculateProgressFromCriteria([
        { id: 'camp001-crit1', text: 'Procédures KYC/KYB mises à jour', isCompleted: true },
        { id: 'camp001-crit2', text: 'Surveillance des transactions renforcée', isCompleted: true },
        { id: 'camp001-crit3', text: 'Personnel formé aux signaux d\'alerte', isCompleted: false },
      ])
    },
    { 
      id: "camp002", name: "RGPD", status: "Planifiée", launchDate: "2024-08-01", target: "Tous les employés",
      completionCriteria: [
        { id: 'camp002-crit1', text: 'Cartographie des données effectuée', isCompleted: false },
        { id: 'camp002-crit2', text: 'Mécanismes de consentement revus', isCompleted: true },
        { id: 'camp002-crit3', text: 'AIPD/DPIA menées pour les nouveaux traitements', isCompleted: false },
      ],
      progress: calculateProgressFromCriteria([
        { id: 'camp002-crit1', text: 'Cartographie des données effectuée', isCompleted: false },
        { id: 'camp002-crit2', text: 'Mécanismes de consentement revus', isCompleted: true },
        { id: 'camp002-crit3', text: 'AIPD/DPIA menées pour les nouveaux traitements', isCompleted: false },
      ])
    },
    { 
      id: "camp003", name: "Déontologie", status: "Terminée", launchDate: "2024-01-28", target: "Tous les employés",
      completionCriteria: [
        { id: 'camp003-crit1', text: 'Code de conduite mis à jour et diffusé', isCompleted: true },
        { id: 'camp003-crit2', text: 'Formation e-learning complétée par 95% des employés', isCompleted: true },
      ],
      progress: 100
    },
];

interface TrainingDataContextType {
  trainingRegistryItems: TrainingRegistryItem[];
  addTrainingRegistryItem: (item: Omit<TrainingRegistryItem, 'id' | 'lastUpdated' | 'progress'>) => void;
  editTrainingRegistryItem: (itemId: string, itemUpdate: Partial<Omit<TrainingRegistryItem, 'id' | 'lastUpdated' | 'progress'>>) => void;
  removeTrainingRegistryItem: (itemId: string) => void;

  upcomingSessions: UpcomingSession[];
  addUpcomingSession: (session: Omit<UpcomingSession, 'id' | 'progress'>) => void;
  editUpcomingSession: (sessionId: string, sessionUpdate: Partial<Omit<UpcomingSession, 'id' | 'progress'>>) => void;
  removeUpcomingSession: (sessionId: string) => void;

  sensitizationCampaigns: SensitizationCampaign[];
  addSensitizationCampaign: (campaign: Omit<SensitizationCampaign, 'id' | 'progress'>) => void;
  editSensitizationCampaign: (campaignId: string, campaignUpdate: Partial<Omit<SensitizationCampaign, 'id' | 'progress'>>) => void;
  removeSensitizationCampaign: (campaignId: string) => void;
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

  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>(() => {
    if (typeof window !== 'undefined') {
      const savedItems = localStorage.getItem('upcomingSessions');
      return savedItems ? JSON.parse(savedItems) : initialUpcomingSessionsMock;
    }
    return initialUpcomingSessionsMock;
  });

  const [sensitizationCampaigns, setSensitizationCampaigns] = useState<SensitizationCampaign[]>(() => {
    if (typeof window !== 'undefined') {
      const savedItems = localStorage.getItem('sensitizationCampaigns');
      return savedItems ? JSON.parse(savedItems) : initialSensitizationCampaignsMock;
    }
    return initialSensitizationCampaignsMock;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trainingRegistryItems', JSON.stringify(trainingRegistryItems));
      localStorage.setItem('upcomingSessions', JSON.stringify(upcomingSessions));
      localStorage.setItem('sensitizationCampaigns', JSON.stringify(sensitizationCampaigns));
    }
  }, [trainingRegistryItems, upcomingSessions, sensitizationCampaigns]);

  // Training Registry CRUD
  const addTrainingRegistryItem = (item: Omit<TrainingRegistryItem, 'id' | 'lastUpdated' | 'progress'>) => {
    const progress = calculateProgressFromCriteria(item.completionCriteria);
    const newItem: TrainingRegistryItem = {
      ...item,
      id: Date.now().toString(),
      lastUpdated: new Date().toISOString().split('T')[0],
      progress,
    };
    setTrainingRegistryItems(prevItems => [newItem, ...prevItems]);
  };

  const editTrainingRegistryItem = (itemId: string, itemUpdate: Partial<Omit<TrainingRegistryItem, 'id' | 'lastUpdated' | 'progress'>>) => {
    setTrainingRegistryItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          const updatedFields = { ...item, ...itemUpdate };
          return {
            ...updatedFields,
            lastUpdated: new Date().toISOString().split('T')[0],
            progress: calculateProgressFromCriteria(updatedFields.completionCriteria),
          };
        }
        return item;
      })
    );
  };

  const removeTrainingRegistryItem = (itemId: string) => {
    setTrainingRegistryItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  // Upcoming Sessions CRUD
  const addUpcomingSession = (session: Omit<UpcomingSession, 'id' | 'progress'>) => {
    const progress = calculateSessionProgress(session);
    const newSession: UpcomingSession = {
         ...session,
         id: Date.now().toString(),
         progress
    };
    setUpcomingSessions(prev => [newSession, ...prev]);
  };

  const editUpcomingSession = (sessionId: string, sessionUpdate: Partial<Omit<UpcomingSession, 'id' | 'progress'>>) => {
    setUpcomingSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
            const updatedFields = { ...s, ...sessionUpdate };
            return { ...updatedFields, progress: calculateSessionProgress(updatedFields) };
        }
        return s;
    }));
  };

  const removeUpcomingSession = (sessionId: string) => {
    setUpcomingSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  // Sensitization Campaigns CRUD
  const addSensitizationCampaign = (campaign: Omit<SensitizationCampaign, 'id' | 'progress'>) => {
    const progress = calculateProgressFromCriteria(campaign.completionCriteria);
    const newCampaign: SensitizationCampaign = { 
        ...campaign, 
        id: Date.now().toString(), 
        progress,
    };
    setSensitizationCampaigns(prev => [newCampaign, ...prev]);
  };

  const editSensitizationCampaign = (campaignId: string, campaignUpdate: Partial<Omit<SensitizationCampaign, 'id' | 'progress'>>) => {
    setSensitizationCampaigns(prev => prev.map(c => {
        if (c.id === campaignId) {
            const updatedFields = { ...c, ...campaignUpdate };
            return { ...updatedFields, progress: calculateProgressFromCriteria(updatedFields.completionCriteria) };
        }
        return c;
    }));
  };

  const removeSensitizationCampaign = (campaignId: string) => {
    setSensitizationCampaigns(prev => prev.filter(c => c.id !== campaignId));
  };


  return (
    <TrainingDataContext.Provider value={{ 
      trainingRegistryItems, addTrainingRegistryItem, editTrainingRegistryItem, removeTrainingRegistryItem,
      upcomingSessions, addUpcomingSession, editUpcomingSession, removeUpcomingSession,
      sensitizationCampaigns, addSensitizationCampaign, editSensitizationCampaign, removeSensitizationCampaign
    }}>
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
