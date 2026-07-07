'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import {
  doc, onSnapshot, setDoc, arrayUnion, updateDoc, getDoc
} from 'firebase/firestore';

// ── Types ──────────────────────────────────────────────────────────────────
export type KycFactor = {
  id: string;
  facteur: string;
  kycPhys: string;
  kycMorale: string;
  kycObnl: string;
  coeff: string;
  agregation: string;
};

export type MatrixHistoryEntry = {
  id: string;
  date: string;
  user: string;
  field: string;
  oldValue: string;
  newValue: string;
};

// ── Default data ────────────────────────────────────────────────────────────
export const DEFAULT_KYC_FACTORS: KycFactor[] = [
  {
    id: 'geo-pays',
    facteur: 'Zones Géographiques (Pays)',
    kycPhys: 'Nationalité, Pays de résidence, Deuxième nationalité',
    kycMorale: 'Pays',
    kycObnl: 'Pays, Adresse de résidence principale',
    coeff: '1',
    agregation: 'Max',
  },
  {
    id: 'geo-gov',
    facteur: 'Zones Géographiques (Gouvernorats)',
    kycPhys: 'Pays de résidence, Gouvernorat',
    kycMorale: 'Gouvernorat',
    kycObnl: '-',
    coeff: '1',
    agregation: 'Max',
  },
  {
    id: 'activite-profession',
    facteur: 'Activité & Profession',
    kycPhys: 'Statut Professionnel, Profession',
    kycMorale: "Nature de l'activité",
    kycObnl: "Type d'organisation",
    coeff: '1',
    agregation: 'Max',
  },
  {
    id: 'produit',
    facteur: 'Produit',
    kycPhys: 'Produit',
    kycMorale: 'Produit',
    kycObnl: 'Produit',
    coeff: '1',
    agregation: '-',
  },
  {
    id: 'canal-distribution',
    facteur: 'Canal de distribution',
    kycPhys: 'Canal de distribution',
    kycMorale: 'Canal de distribution',
    kycObnl: 'Canal de distribution',
    coeff: '-',
    agregation: '-',
  },
  {
    id: 'technique-vente',
    facteur: 'Technique de vente',
    kycPhys: '-',
    kycMorale: '-',
    kycObnl: '-',
    coeff: '1',
    agregation: '-',
  },
  {
    id: 'statuts-specifiques',
    facteur: 'Statuts spécifiques',
    kycPhys: 'PPE, OBNL',
    kycMorale: '-',
    kycObnl: 'OBNL',
    coeff: '1',
    agregation: '-',
  },
];

// ── Firestore paths ─────────────────────────────────────────────────────────
const MATRIX_DOC = 'matrixConfig/kycFactors';

// ── Context type ────────────────────────────────────────────────────────────
interface MatrixConfigContextType {
  kycFactors: KycFactor[];
  kycHistory: MatrixHistoryEntry[];
  loading: boolean;
  updateFactor: (
    id: string,
    field: keyof Omit<KycFactor, 'id' | 'facteur'>,
    newValue: string,
    author: string
  ) => Promise<void>;
  resetFactors: (author: string) => Promise<void>;
}

const MatrixConfigContext = createContext<MatrixConfigContextType | undefined>(undefined);

// ── LocalStorage fallback keys ──────────────────────────────────────────────
const LS_FACTORS = 'matrixKycFactors';
const LS_HISTORY = 'matrixKycHistory';

function lsLoad<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}
function lsSave(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

// ── Provider ─────────────────────────────────────────────────────────────────
export const MatrixConfigProvider = ({ children }: { children: ReactNode }) => {
  const [kycFactors, setKycFactors] = useState<KycFactor[]>(() => lsLoad(LS_FACTORS, DEFAULT_KYC_FACTORS));
  const [kycHistory, setKycHistory] = useState<MatrixHistoryEntry[]>(() => lsLoad(LS_HISTORY, []));
  const [loading, setLoading] = useState(true);

  // ── Real-time Firestore listener ─────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      // offline mode: data already loaded from localStorage
      setLoading(false);
      return;
    }

    const ref = doc(db, MATRIX_DOC);

    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const factors: KycFactor[] = data.factors ?? DEFAULT_KYC_FACTORS;
          const history: MatrixHistoryEntry[] = data.history ?? [];
          setKycFactors(factors);
          setKycHistory(history);
          // Mirror to localStorage for offline resilience
          lsSave(LS_FACTORS, factors);
          lsSave(LS_HISTORY, history);
        } else {
          // First time: seed Firestore with defaults
          await setDoc(ref, {
            factors: DEFAULT_KYC_FACTORS,
            history: [],
            lastUpdated: new Date().toISOString(),
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('[MatrixConfig] Firestore error, using localStorage:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ── Update a single factor field ─────────────────────────────────────────
  const updateFactor = useCallback(
    async (
      id: string,
      field: keyof Omit<KycFactor, 'id' | 'facteur'>,
      newValue: string,
      author: string
    ) => {
      const factor = kycFactors.find((f) => f.id === id);
      if (!factor) return;
      const oldValue = factor[field];
      if (oldValue === newValue) return;

      const updatedFactors = kycFactors.map((f) =>
        f.id === id ? { ...f, [field]: newValue } : f
      );

      const entry: MatrixHistoryEntry = {
        id: String(Date.now()),
        date: new Date().toISOString(),
        user: author,
        field: `${factor.facteur} → ${field}`,
        oldValue,
        newValue,
      };

      const updatedHistory = [entry, ...kycHistory].slice(0, 200);

      // Optimistic local update
      setKycFactors(updatedFactors);
      setKycHistory(updatedHistory);

      if (isFirebaseConfigured && db) {
        try {
          const ref = doc(db, MATRIX_DOC);
          await setDoc(
            ref,
            {
              factors: updatedFactors,
              history: updatedHistory,
              lastUpdated: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {
          console.error('[MatrixConfig] Write error:', e);
          // Persist locally as fallback
          lsSave(LS_FACTORS, updatedFactors);
          lsSave(LS_HISTORY, updatedHistory);
        }
      } else {
        lsSave(LS_FACTORS, updatedFactors);
        lsSave(LS_HISTORY, updatedHistory);
      }
    },
    [kycFactors, kycHistory]
  );

  // ── Reset to defaults ────────────────────────────────────────────────────
  const resetFactors = useCallback(
    async (author: string) => {
      const entry: MatrixHistoryEntry = {
        id: String(Date.now()),
        date: new Date().toISOString(),
        user: author,
        field: 'Réinitialisation complète',
        oldValue: 'Valeurs personnalisées',
        newValue: 'Valeurs par défaut',
      };
      const updatedHistory = [entry, ...kycHistory].slice(0, 200);

      setKycFactors(DEFAULT_KYC_FACTORS);
      setKycHistory(updatedHistory);

      if (isFirebaseConfigured && db) {
        try {
          const ref = doc(db, MATRIX_DOC);
          await setDoc(ref, {
            factors: DEFAULT_KYC_FACTORS,
            history: updatedHistory,
            lastUpdated: new Date().toISOString(),
          });
        } catch (e) {
          console.error('[MatrixConfig] Reset error:', e);
          lsSave(LS_FACTORS, DEFAULT_KYC_FACTORS);
          lsSave(LS_HISTORY, updatedHistory);
        }
      } else {
        lsSave(LS_FACTORS, DEFAULT_KYC_FACTORS);
        lsSave(LS_HISTORY, updatedHistory);
      }
    },
    [kycHistory]
  );

  return (
    <MatrixConfigContext.Provider value={{ kycFactors, kycHistory, loading, updateFactor, resetFactors }}>
      {children}
    </MatrixConfigContext.Provider>
  );
};

export const useMatrixConfig = () => {
  const ctx = useContext(MatrixConfigContext);
  if (!ctx) throw new Error('useMatrixConfig must be used within MatrixConfigProvider');
  return ctx;
};
