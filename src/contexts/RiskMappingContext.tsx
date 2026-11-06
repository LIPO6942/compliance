
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { RiskMappingItem } from '@/types/compliance';
import { initialMockRiskMapping } from '@/data/mockRiskMapping'; // Utilisé UNIQUEMENT en mode démo
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, orderBy, setDoc, getDoc } from "firebase/firestore";
import { useUser } from './UserContext';

export type DataStatus = "loading" | "real" | "demo" | "error" | "empty";

const risksCollectionName = "riskMapping";
const metaDocPath = "riskMappingMeta/global";

interface RiskMappingContextType {
  risks: RiskMappingItem[];
  loading: boolean;
  /** Statut de la source de données :
   *  - "real"  : données Firebase synchronisées
   *  - "demo"  : Firebase non configuré, données fictives affichées volontairement
   *  - "error" : erreur de connexion Firebase (données précédentes conservées)
   *  - "empty" : collection Firebase vide (aucune donnée fictive injectée)
   *  - "loading" : chargement en cours
   */
  dataStatus: DataStatus;
  /** Date de la dernière synchronisation Firebase réussie */
  lastSyncAt: Date | null;
  /** Relance la souscription Firebase */
  retrySync: () => void;
  globalDocumentIds: string[];
  maePositions: Record<number, string>;
  setGlobalDocumentIds: (ids: string[]) => Promise<void>;
  updateMaePosition: (level: number, text: string) => Promise<void>;
  addRisk: (risk: Omit<RiskMappingItem, 'id' | 'lastUpdated' | 'createdAt' | 'planActionLastUpdated' | 'planActionCreatedAt' | 'dmrLastUpdated' | 'dmrCreatedAt'>) => Promise<void>;
  editRisk: (riskId: string, riskUpdate: Partial<Omit<RiskMappingItem, 'id' | 'lastUpdated' | 'createdAt' | 'planActionLastUpdated' | 'planActionCreatedAt' | 'dmrLastUpdated' | 'dmrCreatedAt'>>) => Promise<void>;
  removeRisk: (riskId: string) => Promise<void>;
}

const defaultMaePositions: Record<number, string> = {
  1: "Accepté – contrôles standards",
  2: "Accepté sous conditions – contrôles renforcés",
  3: "Tolérance très limitée – validation Direction Générale",
  4: "Acceptable uniquement suite à dérogation légale validée par l'organe de gouvernance",
};

const RiskMappingContext = createContext<RiskMappingContextType | undefined>(undefined);

export const RiskMappingProvider = ({ children }: { children: ReactNode }) => {
  const [risks, setRisks] = useState<RiskMappingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataStatus, setDataStatus] = useState<DataStatus>("loading");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [globalDocumentIds, setGlobalDocumentIdsState] = useState<string[]>([]);
  const [maePositions, setMaePositionsState] = useState<Record<number, string>>(defaultMaePositions);
  const { isLoaded } = useUser();

  /** Relance la souscription Firebase (force re-mount du listener) */
  const retrySync = useCallback(() => {
    setLoading(true);
    setDataStatus("loading");
    setRetryKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // ── Cas 1 : Firebase non configuré ──────────────────────────────────────
    // Mode démonstration VOLONTAIRE : données fictives affichées, signalées clairement.
    if (!isFirebaseConfigured || !db) {
      setRisks(initialMockRiskMapping);
      setDataStatus("demo");
      setLoading(false);
      console.warn("[RiskMapping] Firebase non configuré — Mode Démonstration actif. Données fictives affichées.");
      return;
    }

    // ── Cas 2 : Firebase configuré → souscription temps réel ────────────────
    setLoading(true);

    // Listener sur les métadonnées (positions MAE, document IDs globaux)
    const metaRef = doc(db, metaDocPath);
    const unsubMeta = onSnapshot(metaRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGlobalDocumentIdsState(data.documentIds || []);
        if (data.maePositions) {
          setMaePositionsState(data.maePositions);
        }
      }
    }, (error) => {
      // Erreur sur meta : non bloquant, on conserve les valeurs par défaut
      console.error("[RiskMapping] Erreur lecture métadonnées Firebase:", error.code, error.message);
    });

    const q = query(collection(db, risksCollectionName), orderBy("lastUpdated", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {

      // ── Cas 2a : Collection réellement vide ─────────────────────────────
      // NE PAS injecter de données fictives. L'administrateur peut créer les premiers risques manuellement.
      if (querySnapshot.empty) {
        setRisks([]);
        setDataStatus("empty");
        setLastSyncAt(new Date());
        setLoading(false);
        console.info("[RiskMapping] Collection Firebase vide — aucune donnée fictive injectée.");
        return;
      }

      // ── Cas 2b : Données réelles reçues ─────────────────────────────────
      const dbRisks = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as RiskMappingItem));
      setRisks(dbRisks);
      setDataStatus("real");
      setLastSyncAt(new Date());
      setLoading(false);

    }, (error) => {
      // ── Cas 2c : Erreur Firebase ────────────────────────────────────────
      // IMPORTANT : NE PAS remplacer les données par des données fictives.
      // Les données précédemment chargées sont conservées en mémoire.
      console.error("[RiskMapping] Erreur Firebase onSnapshot:", error.code, error.message);
      setDataStatus("error");
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubMeta();
    };
  }, [isLoaded, retryKey]);

  // ── Métadonnées ──────────────────────────────────────────────────────────

  const setGlobalDocumentIds = async (ids: string[]) => {
    setGlobalDocumentIdsState(ids);
    if (!isFirebaseConfigured || !db) return;
    const metaRef = doc(db, metaDocPath);
    await setDoc(metaRef, { documentIds: ids }, { merge: true });
  };

  const updateMaePosition = async (level: number, text: string) => {
    const newPositions = { ...maePositions, [level]: text };
    setMaePositionsState(newPositions);
    if (!isFirebaseConfigured || !db) return;
    const metaRef = doc(db, metaDocPath);
    await setDoc(metaRef, { maePositions: newPositions }, { merge: true });
  };

  // ── CRUD — inchangé, sécurisé par la garde isFirebaseConfigured ──────────

  const addRisk = async (risk: Omit<RiskMappingItem, 'id' | 'lastUpdated' | 'createdAt' | 'planActionLastUpdated' | 'planActionCreatedAt' | 'dmrLastUpdated' | 'dmrCreatedAt'>) => {
    const cleanRisk = Object.fromEntries(
      Object.entries(risk).filter(([, value]) => value !== undefined)
    );
    const today = new Date().toISOString().split('T')[0];
    const newRisk: RiskMappingItem = {
      id: `risk_${Date.now()}`,
      ...cleanRisk,
      createdAt: today,
      lastUpdated: today,
      planActionCreatedAt: today,
      planActionLastUpdated: today,
      dmrCreatedAt: today,
      dmrLastUpdated: today,
    } as RiskMappingItem;

    setRisks((prev) => [newRisk, ...prev]);

    if (!isFirebaseConfigured || !db) return;
    await addDoc(collection(db, risksCollectionName), newRisk);
  };

  const editRisk = async (riskId: string, riskUpdate: Partial<Omit<RiskMappingItem, 'id' | 'lastUpdated' | 'createdAt' | 'planActionLastUpdated' | 'planActionCreatedAt' | 'dmrLastUpdated' | 'dmrCreatedAt'>>) => {
    const ctafFields = ['ctafClassification', 'ctafNotifRef', 'ctafComment'];

    const cleanUpdate = Object.fromEntries(
      Object.entries(riskUpdate).filter(([key, value]) => {
        if (ctafFields.includes(key)) return true;
        return value !== undefined;
      }).map(([key, value]) => {
        if (ctafFields.includes(key) && value === undefined) return [key, null];
        return [key, value];
      })
    );

    const planActionFields = ['weaknessPoint', 'actionCorrective', 'deadline', 'responsible', 'completionLevel'];
    const dmrFields = ['dmrEfficiency', 'dmrProbability', 'justification', 'maePosition'];

    const today = new Date().toISOString().split('T')[0];
    const updates: Record<string, unknown> = { ...cleanUpdate };

    const hasPlanActionUpdate = Object.keys(cleanUpdate).some(key => planActionFields.includes(key));
    const hasDmrUpdate = Object.keys(cleanUpdate).some(key => dmrFields.includes(key));
    const hasCtafUpdate = Object.keys(cleanUpdate).some(key => ctafFields.includes(key));

    if (hasPlanActionUpdate) updates.planActionLastUpdated = today;
    if (hasDmrUpdate) updates.dmrLastUpdated = today;
    if (!hasPlanActionUpdate && !hasDmrUpdate) updates.lastUpdated = today;
    if (hasCtafUpdate) updates.lastUpdated = today;

    setRisks((prev) =>
      prev.map((r) => (r.id === riskId ? ({ ...r, ...updates } as RiskMappingItem) : r))
    );

    if (!isFirebaseConfigured || !db) return;
    const docRef = doc(db, risksCollectionName, riskId);
    await updateDoc(docRef, updates);
  };

  const removeRisk = async (riskId: string) => {
    setRisks((prev) => prev.filter((r) => r.id !== riskId));

    if (!isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, risksCollectionName, riskId));
  };

  return (
    <RiskMappingContext.Provider value={{
      risks,
      loading,
      dataStatus,
      lastSyncAt,
      retrySync,
      globalDocumentIds,
      maePositions,
      setGlobalDocumentIds,
      updateMaePosition,
      addRisk,
      editRisk,
      removeRisk,
    }}>
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
