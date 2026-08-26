
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { 
  TrainingRegistryItem, 
  UpcomingSession, 
  SensitizationCampaign, 
  CompletionCriterion,
  TrainingReportParticipant,
  TrainingProgramEvaluation
} from '@/types/compliance';
import { 
  initialMockTrainingRegistry, 
  initialMockUpcomingSessions, 
  initialMockSensitizationCampaigns 
} from '@/data/mockTrainingData';
import {
  initialAnnualEvaluation,
  initialEmptyParticipants,
  sampleReferenceTemplate
} from '@/data/annualTrainingReportData';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, query, orderBy, writeBatch, setDoc } from 'firebase/firestore';
import { useUser } from './UserContext';

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

const registryCollectionName = "trainingRegistry";
const sessionsCollectionName = "upcomingSessions";
const campaignsCollectionName = "sensitizationCampaigns";
const annualParticipantsCollectionName = "annualTrainingParticipants";
const annualEvaluationDocName = "annualTrainingEvaluation";

interface TrainingDataContextType {
  trainingRegistryItems: TrainingRegistryItem[];
  upcomingSessions: UpcomingSession[];
  sensitizationCampaigns: SensitizationCampaign[];
  annualReportParticipants: TrainingReportParticipant[];
  annualProgramEvaluation: TrainingProgramEvaluation;
  loading: boolean;

  addTrainingRegistryItem: (item: Omit<TrainingRegistryItem, 'id' | 'lastUpdated' | 'progress'>) => Promise<void>;
  editTrainingRegistryItem: (itemId: string, itemUpdate: Partial<Omit<TrainingRegistryItem, 'id' | 'lastUpdated' | 'progress'>>) => Promise<void>;
  removeTrainingRegistryItem: (itemId: string) => Promise<void>;

  addUpcomingSession: (session: Omit<UpcomingSession, 'id' | 'progress'>) => Promise<void>;
  editUpcomingSession: (sessionId: string, sessionUpdate: Partial<Omit<UpcomingSession, 'id' | 'progress'>>) => Promise<void>;
  removeUpcomingSession: (sessionId: string) => Promise<void>;

  addSensitizationCampaign: (campaign: Omit<SensitizationCampaign, 'id' | 'progress'>) => Promise<void>;
  editSensitizationCampaign: (campaignId: string, campaignUpdate: Partial<Omit<SensitizationCampaign, 'id' | 'progress'>>) => Promise<void>;
  removeSensitizationCampaign: (campaignId: string) => Promise<void>;

  // Annual Report Actions
  addReportParticipant: (participant: Omit<TrainingReportParticipant, 'id'>) => Promise<void>;
  editReportParticipant: (id: string, updates: Partial<Omit<TrainingReportParticipant, 'id'>>) => Promise<void>;
  removeReportParticipant: (id: string) => Promise<void>;
  bulkAddReportParticipants: (participants: Omit<TrainingReportParticipant, 'id'>[]) => Promise<void>;
  updateAnnualEvaluation: (evaluation: Partial<TrainingProgramEvaluation>) => Promise<void>;
  resetReportParticipants: () => Promise<void>;
  loadSampleReferenceData: () => Promise<void>;
}


const TrainingDataContext = createContext<TrainingDataContextType | undefined>(undefined);

export const TrainingDataProvider = ({ children }: { children: ReactNode }) => {
  const [trainingRegistryItems, setTrainingRegistryItems] = useState<TrainingRegistryItem[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [sensitizationCampaigns, setSensitizationCampaigns] = useState<SensitizationCampaign[]>([]);
  const [annualReportParticipants, setAnnualReportParticipants] = useState<TrainingReportParticipant[]>([]);
  const [annualProgramEvaluation, setAnnualProgramEvaluation] = useState<TrainingProgramEvaluation>(initialAnnualEvaluation);
  const [loading, setLoading] = useState(true);
  const { isLoaded } = useUser();

  // Local storage initialization as safe fallback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedParticipants = localStorage.getItem('annual_training_participants');
        if (savedParticipants) {
          setAnnualReportParticipants(JSON.parse(savedParticipants));
        } else {
          setAnnualReportParticipants(initialEmptyParticipants);
        }

        const savedEval = localStorage.getItem('annual_training_evaluation');
        if (savedEval) {
          setAnnualProgramEvaluation(JSON.parse(savedEval));
        }
      } catch (e) {
        console.error("Failed to load local training report data", e);
      }
    }
  }, []);

  // Save to localStorage whenever participants or evaluation changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('annual_training_participants', JSON.stringify(annualReportParticipants));
      } catch (e) {
        console.error("Failed to save participants to localStorage", e);
      }
    }
  }, [annualReportParticipants]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('annual_training_evaluation', JSON.stringify(annualProgramEvaluation));
      } catch (e) {
        console.error("Failed to save evaluation to localStorage", e);
      }
    }
  }, [annualProgramEvaluation]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isFirebaseConfigured || !db) {
        setTrainingRegistryItems(initialMockTrainingRegistry);
        setUpcomingSessions(initialMockUpcomingSessions);
        setSensitizationCampaigns(initialMockSensitizationCampaigns);
        setLoading(false);
        console.warn("Firebase not configured. Falling back to mock training data.");
        return;
    }
    
    const seedIfEmpty = (collectionName: string, mockData: any[], snapshot: any) => {
        if (snapshot.empty && loading) {
            console.log(`[${collectionName}] collection is empty. Seeding with mock data.`);
            const batch = writeBatch(db!);
            mockData.forEach((item) => {
                const { id, ...data } = item;
                const docRef = doc(collection(db!, collectionName));
                batch.set(docRef, data);
            });
            batch.commit().catch(e => console.error(`Failed to seed ${collectionName}:`, e));
            return true;
        }
        return false;
    };
    
    const loadedStatus = { registry: false, sessions: false, campaigns: false };
    const checkAllLoaded = () => {
      if (Object.values(loadedStatus).every(Boolean)) {
        setLoading(false);
      }
    };

    const unsubRegistry = onSnapshot(query(collection(db, registryCollectionName), orderBy("lastUpdated", "desc")), (snapshot) => {
        if (seedIfEmpty(registryCollectionName, initialMockTrainingRegistry, snapshot)) return;
        setTrainingRegistryItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingRegistryItem)));
        if (!loadedStatus.registry) {
            loadedStatus.registry = true;
            checkAllLoaded();
        }
    }, (error) => {
        console.error(`Error with ${registryCollectionName}:`, error);
        setTrainingRegistryItems(initialMockTrainingRegistry);
        if (!loadedStatus.registry) {
            loadedStatus.registry = true;
            checkAllLoaded();
        }
    });

    const unsubSessions = onSnapshot(query(collection(db, sessionsCollectionName), orderBy("date", "desc")), (snapshot) => {
        if (seedIfEmpty(sessionsCollectionName, initialMockUpcomingSessions, snapshot)) return;
        setUpcomingSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UpcomingSession)));
        if (!loadedStatus.sessions) {
            loadedStatus.sessions = true;
            checkAllLoaded();
        }
    }, (error) => {
        console.error(`Error with ${sessionsCollectionName}:`, error);
        setUpcomingSessions(initialMockUpcomingSessions);
        if (!loadedStatus.sessions) {
            loadedStatus.sessions = true;
            checkAllLoaded();
        }
    });

    const unsubCampaigns = onSnapshot(query(collection(db, campaignsCollectionName), orderBy("launchDate", "desc")), (snapshot) => {
        if (seedIfEmpty(campaignsCollectionName, initialMockSensitizationCampaigns, snapshot)) return;
        setSensitizationCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SensitizationCampaign)));
        if (!loadedStatus.campaigns) {
            loadedStatus.campaigns = true;
            checkAllLoaded();
        }
    }, (error) => {
        console.error(`Error with ${campaignsCollectionName}:`, error);
        setSensitizationCampaigns(initialMockSensitizationCampaigns);
        if (!loadedStatus.campaigns) {
            loadedStatus.campaigns = true;
            checkAllLoaded();
        }
    });

    return () => {
      unsubRegistry();
      unsubSessions();
      unsubCampaigns();
    };
  }, [isLoaded, loading]);

  // Training Registry CRUD
  const addTrainingRegistryItem = async (item: Omit<TrainingRegistryItem, 'id' | 'lastUpdated' | 'progress'>) => {
    if (!isFirebaseConfigured || !db) return;
    await addDoc(collection(db, registryCollectionName), {
      ...item,
      lastUpdated: new Date().toISOString().split('T')[0],
      progress: calculateProgressFromCriteria(item.completionCriteria),
    });
  };

  const editTrainingRegistryItem = async (itemId: string, itemUpdate: Partial<Omit<TrainingRegistryItem, 'id' | 'lastUpdated' | 'progress'>>) => {
    if (!isFirebaseConfigured || !db) return;
    await updateDoc(doc(db, registryCollectionName, itemId), {
      ...itemUpdate,
      lastUpdated: new Date().toISOString().split('T')[0],
      progress: calculateProgressFromCriteria(itemUpdate.completionCriteria),
    });
  };

  const removeTrainingRegistryItem = async (itemId: string) => {
    if (!isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, registryCollectionName, itemId));
  };

  // Upcoming Sessions CRUD
  const addUpcomingSession = async (session: Omit<UpcomingSession, 'id' | 'progress'>) => {
    if (!isFirebaseConfigured || !db) return;
    await addDoc(collection(db, sessionsCollectionName), {
      ...session,
      progress: calculateSessionProgress(session)
    });
  };

  const editUpcomingSession = async (sessionId: string, sessionUpdate: Partial<Omit<UpcomingSession, 'id' | 'progress'>>) => {
    if (!isFirebaseConfigured || !db) return;
    const updatedFields = { ...sessionUpdate, progress: calculateSessionProgress(sessionUpdate) };
    await updateDoc(doc(db, sessionsCollectionName, sessionId), updatedFields);
  };

  const removeUpcomingSession = async (sessionId: string) => {
    if (!isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, sessionsCollectionName, sessionId));
  };

  // Sensitization Campaigns CRUD
  const addSensitizationCampaign = async (campaign: Omit<SensitizationCampaign, 'id' | 'progress'>) => {
    if (!isFirebaseConfigured || !db) return;
    await addDoc(collection(db, campaignsCollectionName), {
      ...campaign,
      progress: calculateProgressFromCriteria(campaign.completionCriteria),
    });
  };

  const editSensitizationCampaign = async (campaignId: string, campaignUpdate: Partial<Omit<SensitizationCampaign, 'id' | 'progress'>>) => {
    if (!isFirebaseConfigured || !db) return;
    await updateDoc(doc(db, campaignsCollectionName, campaignId), {
      ...campaignUpdate,
      progress: calculateProgressFromCriteria(campaignUpdate.completionCriteria),
    });
  };

  const removeSensitizationCampaign = async (campaignId: string) => {
    if (!isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, campaignsCollectionName, campaignId));
  };

  // Annual Report Actions
  const addReportParticipant = async (participant: Omit<TrainingReportParticipant, 'id'>) => {
    const newParticipant: TrainingReportParticipant = {
      ...participant,
      id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      participantNumber: participant.participantNumber || (annualReportParticipants.length + 1)
    };
    setAnnualReportParticipants(prev => [...prev, newParticipant]);
  };

  const editReportParticipant = async (id: string, updates: Partial<Omit<TrainingReportParticipant, 'id'>>) => {
    setAnnualReportParticipants(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removeReportParticipant = async (id: string) => {
    setAnnualReportParticipants(prev => {
      const filtered = prev.filter(p => p.id !== id);
      // Re-index participant numbers smoothly
      return filtered.map((p, idx) => ({ ...p, participantNumber: idx + 1 }));
    });
  };

  const bulkAddReportParticipants = async (newParticipants: Omit<TrainingReportParticipant, 'id'>[]) => {
    const startIndex = annualReportParticipants.length;
    const formatted: TrainingReportParticipant[] = newParticipants.map((p, idx) => ({
      ...p,
      id: `part-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      participantNumber: startIndex + idx + 1
    }));
    setAnnualReportParticipants(prev => [...prev, ...formatted]);
  };

  const updateAnnualEvaluation = async (evaluationUpdate: Partial<TrainingProgramEvaluation>) => {
    setAnnualProgramEvaluation(prev => ({
      ...prev,
      ...evaluationUpdate,
    }));
  };

  const resetReportParticipants = async () => {
    setAnnualReportParticipants([]);
  };

  const loadSampleReferenceData = async () => {
    setAnnualReportParticipants(sampleReferenceTemplate);
  };

  return (
    <TrainingDataContext.Provider value={{
      trainingRegistryItems,
      upcomingSessions,
      sensitizationCampaigns,
      annualReportParticipants,
      annualProgramEvaluation,
      loading,
      addTrainingRegistryItem, editTrainingRegistryItem, removeTrainingRegistryItem,
      addUpcomingSession, editUpcomingSession, removeUpcomingSession,
      addSensitizationCampaign, editSensitizationCampaign, removeSensitizationCampaign,
      addReportParticipant, editReportParticipant, removeReportParticipant,
      bulkAddReportParticipants, updateAnnualEvaluation, resetReportParticipants,
      loadSampleReferenceData
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
