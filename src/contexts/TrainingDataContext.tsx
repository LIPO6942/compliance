
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { TrainingRegistryItem, UpcomingSession, SensitizationCampaign, UpcomingSessionType, SensitizationCampaignStatus } from '@/types/compliance';

// Helper function to calculate progress for UpcomingSession
const calculateSessionProgress = (session: Partial<Pick<UpcomingSession, 'logisticsConfirmed' | 'materialsPrepared' | 'invitationsSent'>>) => {
  let completedCriteria = 0;
  const totalCriteria = 3;
  if (session.logisticsConfirmed) completedCriteria++;
  if (session.materialsPrepared) completedCriteria++;
  if (session.invitationsSent) completedCriteria++;
  return Math.round((completedCriteria / totalCriteria) * 100);
};

// Helper function to calculate progress for TrainingRegistryItem
const calculateRegistryItemProgress = (item: Partial<Pick<TrainingRegistryItem, 'contentReviewedRecently' | 'assessmentAvailable' | 'feedbackMechanismInPlace'>>) => {
  let completedCriteria = 0;
  const totalCriteria = 3;
  if (item.contentReviewedRecently) completedCriteria++;
  if (item.assessmentAvailable) completedCriteria++;
  if (item.feedbackMechanismInPlace) completedCriteria++;
  return Math.round((completedCriteria / totalCriteria) * 100);
};


// Initial mock data
const initialTrainingRegistryMock: TrainingRegistryItem[] = [
  { id: "reg001", title: "Principes Fondamentaux de la LAB-FT", objective: "Comprendre les mécanismes de LCB-FT et les obligations réglementaires.", duration: "2h", support: "Présentation PPT, Quiz", lastUpdated: "2024-06-01", contentReviewedRecently: true, assessmentAvailable: true, feedbackMechanismInPlace: false, progress: calculateRegistryItemProgress({contentReviewedRecently: true, assessmentAvailable: true, feedbackMechanismInPlace: false}) },
  { id: "reg002", title: "Application du RGPD en Entreprise", objective: "Maîtriser les règles de protection des données personnelles.", duration: "3h", support: "Vidéo, Études de cas", lastUpdated: "2024-05-15", contentReviewedRecently: false, assessmentAvailable: true, feedbackMechanismInPlace: true, progress: calculateRegistryItemProgress({contentReviewedRecently: false, assessmentAvailable: true, feedbackMechanismInPlace: true}) },
  { id: "reg003", title: "Code de Conduite et Éthique Professionnelle", objective: "Adopter les bons comportements et respecter les règles déontologiques.", duration: "1.5h", support: "Manuel, Scénarios", lastUpdated: "2024-07-01", contentReviewedRecently: true, assessmentAvailable: false, feedbackMechanismInPlace: false, progress: calculateRegistryItemProgress({ contentReviewedRecently: true, assessmentAvailable: false, feedbackMechanismInPlace: false }) },
];

const initialUpcomingSessionsMock: UpcomingSession[] = [
  { id: "sess001", title: "Formation LAB-FT (Recyclage)", date: "2024-09-15", type: "Obligatoire", department: "Tous", logisticsConfirmed: true, materialsPrepared: true, invitationsSent: false, progress: calculateSessionProgress({logisticsConfirmed: true, materialsPrepared: true, invitationsSent: false}) },
  { id: "sess002", title: "Nouveautés RGPD et Impact Opérationnel", date: "2024-10-05", type: "Recommandée", department: "Marketing, IT", logisticsConfirmed: false, materialsPrepared: true, invitationsSent: true, progress: calculateSessionProgress({logisticsConfirmed: false, materialsPrepared: true, invitationsSent: true}) },
  { id: "sess003", title: "Sensibilisation à la Déontologie Financière", date: "2024-11-20", type: "Obligatoire", department: "Finance, Vente", logisticsConfirmed: true, materialsPrepared: false, invitationsSent: false, progress: calculateSessionProgress({logisticsConfirmed: true, materialsPrepared: false, invitationsSent: false}) },
];

const initialSensitizationCampaignsMock: SensitizationCampaign[] = [
    { id: "camp001", name: "LAB-FT", status: "En cours", launchDate: "2024-07-10", target: "Commerciaux, Middle Office", iconName: "ShieldAlert", progress: 75 },
    { id: "camp002", name: "RGPD", status: "Planifiée", launchDate: "2024-08-01", target: "Tous les employés", iconName: "FileText", progress: 20 },
    { id: "camp003", name: "Déontologie", status: "Terminée", launchDate: "2024-01-28", target: "Tous les employés", iconName: "Gavel", progress: 100 },
    { id: "camp004", name: "Rappel bonnes pratiques mots de passe", status: "Planifiée", launchDate: "2024-08-01", target: "Tous les employés", iconName: "KeyRound", progress: 0 },
    { id: "camp005", name: "Journée de la Protection des Données", status: "Terminée", launchDate: "2024-01-28", target: "Tous les employés", iconName: "CheckCircle", progress: 100 }
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
  addSensitizationCampaign: (campaign: Omit<SensitizationCampaign, 'id'>) => void;
  editSensitizationCampaign: (campaignId: string, campaignUpdate: Partial<Omit<SensitizationCampaign, 'id'>>) => void;
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
    const progress = calculateRegistryItemProgress(item);
    const newItem: TrainingRegistryItem = {
      ...item,
      id: Date.now().toString(),
      lastUpdated: new Date().toISOString().split('T')[0],
      contentReviewedRecently: item.contentReviewedRecently || false,
      assessmentAvailable: item.assessmentAvailable || false,
      feedbackMechanismInPlace: item.feedbackMechanismInPlace || false,
      progress,
    };
    setTrainingRegistryItems(prevItems => [newItem, ...prevItems]);
  };

  const editTrainingRegistryItem = (itemId: string, itemUpdate: Partial<Omit<TrainingRegistryItem, 'id' | 'lastUpdated' | 'progress'>>) => {
    setTrainingRegistryItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          const updatedFields = {
            ...item,
            ...itemUpdate,
            contentReviewedRecently: itemUpdate.contentReviewedRecently !== undefined ? itemUpdate.contentReviewedRecently : item.contentReviewedRecently,
            assessmentAvailable: itemUpdate.assessmentAvailable !== undefined ? itemUpdate.assessmentAvailable : item.assessmentAvailable,
            feedbackMechanismInPlace: itemUpdate.feedbackMechanismInPlace !== undefined ? itemUpdate.feedbackMechanismInPlace : item.feedbackMechanismInPlace,
          };
          return {
            ...updatedFields,
            lastUpdated: new Date().toISOString().split('T')[0],
            progress: calculateRegistryItemProgress(updatedFields),
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
         logisticsConfirmed: session.logisticsConfirmed || false,
         materialsPrepared: session.materialsPrepared || false,
         invitationsSent: session.invitationsSent || false,
         progress
    };
    setUpcomingSessions(prev => [newSession, ...prev]);
  };

  const editUpcomingSession = (sessionId: string, sessionUpdate: Partial<Omit<UpcomingSession, 'id' | 'progress'>>) => {
    setUpcomingSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
            const updatedFields = {
                ...s,
                ...sessionUpdate,
                logisticsConfirmed: sessionUpdate.logisticsConfirmed !== undefined ? sessionUpdate.logisticsConfirmed : s.logisticsConfirmed,
                materialsPrepared: sessionUpdate.materialsPrepared !== undefined ? sessionUpdate.materialsPrepared : s.materialsPrepared,
                invitationsSent: sessionUpdate.invitationsSent !== undefined ? sessionUpdate.invitationsSent : s.invitationsSent,
            };
            return { ...updatedFields, progress: calculateSessionProgress(updatedFields) };
        }
        return s;
    }));
  };

  const removeUpcomingSession = (sessionId: string) => {
    setUpcomingSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  // Sensitization Campaigns CRUD
  const addSensitizationCampaign = (campaign: Omit<SensitizationCampaign, 'id'>) => {
    const newCampaign: SensitizationCampaign = { ...campaign, id: Date.now().toString(), progress: campaign.progress || 0 };
    setSensitizationCampaigns(prev => [newCampaign, ...prev]);
  };

  const editSensitizationCampaign = (campaignId: string, campaignUpdate: Partial<Omit<SensitizationCampaign, 'id'>>) => {
    setSensitizationCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, ...campaignUpdate } : c));
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
