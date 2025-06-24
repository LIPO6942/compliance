
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { TrainingRegistryItem, UpcomingSession, SensitizationCampaign, CompletionCriterion } from '@/types/compliance';
import { 
  initialMockTrainingRegistry, 
  initialMockUpcomingSessions, 
  initialMockSensitizationCampaigns 
} from '@/data/mockTrainingData';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
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

interface TrainingDataContextType {
  trainingRegistryItems: TrainingRegistryItem[];
  upcomingSessions: UpcomingSession[];
  sensitizationCampaigns: SensitizationCampaign[];
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
}

const TrainingDataContext = createContext<TrainingDataContextType | undefined>(undefined);

export const TrainingDataProvider = ({ children }: { children: ReactNode }) => {
  const [trainingRegistryItems, setTrainingRegistryItems] = useState<TrainingRegistryItem[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [sensitizationCampaigns, setSensitizationCampaigns] = useState<SensitizationCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    const loadMockData = () => {
        setTrainingRegistryItems(initialMockTrainingRegistry);
        setUpcomingSessions(initialMockUpcomingSessions);
        setSensitizationCampaigns(initialMockSensitizationCampaigns);
        setLoading(false);
        console.warn("Firebase is not configured or failed to load. Falling back to mock training data.");
    };

    if (!isFirebaseConfigured || !db) {
        loadMockData();
        return;
    }

    let loadedCount = 0;
    const totalCollections = 3;
    let hasError = false;

    const onAllLoaded = () => {
        loadedCount++;
        if (loadedCount === totalCollections && !hasError) {
            setLoading(false);
        }
    }

    const onError = (error: Error) => {
        if (!hasError) {
            hasError = true;
            console.error(error);
            loadMockData();
        }
    };

    const qRegistry = query(collection(db, registryCollectionName), orderBy("lastUpdated", "desc"));
    const unsubRegistry = onSnapshot(qRegistry, (snapshot) => {
      setTrainingRegistryItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingRegistryItem)));
      onAllLoaded();
    }, (error) => onError(error));

    const qSessions = query(collection(db, sessionsCollectionName), orderBy("date", "desc"));
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      setUpcomingSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UpcomingSession)));
      onAllLoaded();
    }, (error) => onError(error));

    const qCampaigns = query(collection(db, campaignsCollectionName), orderBy("launchDate", "desc"));
    const unsubCampaigns = onSnapshot(qCampaigns, (snapshot) => {
      setSensitizationCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SensitizationCampaign)));
      onAllLoaded();
    }, (error) => onError(error));

    return () => {
      unsubRegistry();
      unsubSessions();
      unsubCampaigns();
    };
  }, [isLoaded]);

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

  return (
    <TrainingDataContext.Provider value={{
      trainingRegistryItems,
      upcomingSessions,
      sensitizationCampaigns,
      loading,
      addTrainingRegistryItem, editTrainingRegistryItem, removeTrainingRegistryItem,
      addUpcomingSession, editUpcomingSession, removeUpcomingSession,
      addSensitizationCampaign, editSensitizationCampaign, removeSensitizationCampaign
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
