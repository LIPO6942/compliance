'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import {
  doc, onSnapshot, setDoc, collection, addDoc
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

export type OverrideCategory = 'profession' | 'moral' | 'country' | 'gov' | 'product' | 'dist' | 'sale';

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
const MATRIX_OVERRIDES_DOC = 'matrixConfig/allOverrides';

// ── Context type ────────────────────────────────────────────────────────────
interface MatrixConfigContextType {
  kycFactors: KycFactor[];
  kycHistory: MatrixHistoryEntry[];
  loading: boolean;
  
  overrides: Record<OverrideCategory, Record<string, Record<string, boolean>>>;
  professionOverrides: Record<string, Record<string, boolean>>; // alias
  
  updateFactor: (
    id: string,
    field: keyof Omit<KycFactor, 'id' | 'facteur'>,
    newValue: string,
    author: string
  ) => Promise<void>;
  
  resetFactors: (author: string) => Promise<void>;
  
  updateOverride: (
    category: OverrideCategory,
    itemId: string,
    field: string,
    value: boolean,
    author: string
  ) => Promise<void>;
  
  resetOverrides: (
    category: OverrideCategory | 'all',
    author: string
  ) => Promise<void>;
  
  updateProfessionFactor: (
    professionName: string,
    field: string,
    value: boolean,
    author: string
  ) => Promise<void>;
  
  resetProfessionOverrides: (author: string) => Promise<void>;
}

const MatrixConfigContext = createContext<MatrixConfigContextType | undefined>(undefined);

// ── LocalStorage fallback keys ──────────────────────────────────────────────
const LS_FACTORS = 'matrixKycFactors';
const LS_HISTORY = 'matrixKycHistory';
const LS_OVERRIDES = 'matrixKycAllOverrides';

const DEFAULT_OVERRIDES: Record<OverrideCategory, Record<string, Record<string, boolean>>> = {
  profession: {},
  moral: {},
  country: {},
  gov: {},
  product: {},
  dist: {},
  sale: {}
};

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
  const [overrides, setOverrides] = useState<Record<OverrideCategory, Record<string, Record<string, boolean>>>>(() => lsLoad(LS_OVERRIDES, DEFAULT_OVERRIDES));
  const [loading, setLoading] = useState(true);

  // ── Real-time Firestore listener ─────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setLoading(false);
      return;
    }

    const ref = doc(db, MATRIX_DOC);
    const overridesRef = doc(db, MATRIX_OVERRIDES_DOC);

    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const factors: KycFactor[] = data.factors ?? DEFAULT_KYC_FACTORS;
          const history: MatrixHistoryEntry[] = data.history ?? [];
          setKycFactors(factors);
          setKycHistory(history);
          lsSave(LS_FACTORS, factors);
          lsSave(LS_HISTORY, history);
        } else {
          await setDoc(ref, {
            factors: DEFAULT_KYC_FACTORS,
            history: [],
            lastUpdated: new Date().toISOString(),
          });
        }
      },
      (err) => {
        console.error('[MatrixConfig] factors Firestore error:', err);
      }
    );

    const unsubOverrides = onSnapshot(
      overridesRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const loadedOverrides = {
            profession: data.profession ?? {},
            moral: data.moral ?? {},
            country: data.country ?? {},
            gov: data.gov ?? {},
            product: data.product ?? {},
            dist: data.dist ?? {},
            sale: data.sale ?? {}
          };
          setOverrides(loadedOverrides);
          lsSave(LS_OVERRIDES, loadedOverrides);
        } else {
          setDoc(overridesRef, DEFAULT_OVERRIDES);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[MatrixConfig] overrides Firestore error:', err);
        setLoading(false);
      }
    );

    return () => {
      unsub();
      unsubOverrides();
    };
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

          // Collaborative live dashboard logging
          try {
            await addDoc(collection(db, "riskFactorLogs"), {
              date: new Date().toISOString(),
              user: author,
              factors: ["Coefficients & Structure"],
              note: `Modification du coefficient ou du KYC pour « ${factor.facteur} » : ${oldValue} → ${newValue}`,
            });
          } catch (logErr) {
            console.error('[MatrixConfig] Failed to write live log:', logErr);
          }
        } catch (e) {
          console.error('[MatrixConfig] Write error:', e);
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

  // ── Reset factors to defaults ─────────────────────────────────────────────
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

  // ── Generic update override ────────────────────────────────────────────────
  const updateOverride = useCallback(
    async (category: OverrideCategory, itemId: string, field: string, value: boolean, author: string) => {
      const updatedOverrides = { ...overrides };
      if (!updatedOverrides[category]) {
        updatedOverrides[category] = {};
      }
      if (!updatedOverrides[category][itemId]) {
        updatedOverrides[category][itemId] = {};
      }

      const oldValue = updatedOverrides[category][itemId][field] ? 'Oui' : 'Non (—)';
      const newValue = value ? 'Oui' : 'Non (—)';

      updatedOverrides[category][itemId][field] = value;

      const catLabel: Record<OverrideCategory, string> = {
        profession: 'Prof. PP',
        moral: 'Activité PM',
        country: 'Pays',
        gov: 'Gouvernorat',
        product: 'Produit',
        dist: 'Canal',
        sale: 'Technique'
      };

      const entry: MatrixHistoryEntry = {
        id: String(Date.now()),
        date: new Date().toISOString(),
        user: author,
        field: `${catLabel[category] || category} [${itemId}] → ${field}`,
        oldValue,
        newValue,
      };

      const updatedHistory = [entry, ...kycHistory].slice(0, 200);

      setOverrides(updatedOverrides);
      setKycHistory(updatedHistory);
      lsSave(LS_OVERRIDES, updatedOverrides);
      lsSave(LS_HISTORY, updatedHistory);

      if (isFirebaseConfigured && db) {
        try {
          const overridesRef = doc(db, MATRIX_OVERRIDES_DOC);
          await setDoc(overridesRef, { [category]: updatedOverrides[category] }, { merge: true });

          const ref = doc(db, MATRIX_DOC);
          await setDoc(ref, { history: updatedHistory }, { merge: true });

          // Collaborative live dashboard logging
          try {
            const dashboardCategoryMap: Record<OverrideCategory, string> = {
              profession: "Profession PP",
              moral: "Activité P. Morales",
              country: "Pays",
              gov: "Gouvernorats",
              product: "Produits",
              dist: "Voie de distribution / Vente",
              sale: "Voie de distribution / Vente",
            };
            await addDoc(collection(db, "riskFactorLogs"), {
              date: new Date().toISOString(),
              user: author,
              factors: [dashboardCategoryMap[category] || category],
              note: `Modification sur « ${itemId} » : le paramètre « ${field} » a été mis à ${value ? 'Oui' : 'Non'}`,
            });
          } catch (logErr) {
            console.error('[MatrixConfig] Failed to write live log:', logErr);
          }
        } catch (e) {
          console.error('[MatrixConfig] Override Write error:', e);
        }
      }
    },
    [overrides, kycHistory]
  );

  // ── Generic reset overrides ────────────────────────────────────────────────
  const resetOverrides = useCallback(
    async (category: OverrideCategory | 'all', author: string) => {
      const updatedOverrides = { ...overrides };
      
      if (category === 'all') {
        Object.keys(DEFAULT_OVERRIDES).forEach((cat) => {
          updatedOverrides[cat as OverrideCategory] = {};
        });
      } else {
        updatedOverrides[category] = {};
      }

      const entry: MatrixHistoryEntry = {
        id: String(Date.now()),
        date: new Date().toISOString(),
        user: author,
        field: category === 'all' ? 'Réinitialisation complète de la matrice' : `Réinitialisation [${category}]`,
        oldValue: 'Personnalisations',
        newValue: 'Valeurs d\'origine',
      };

      const updatedHistory = [entry, ...kycHistory].slice(0, 200);

      setOverrides(updatedOverrides);
      setKycHistory(updatedHistory);
      lsSave(LS_OVERRIDES, updatedOverrides);
      lsSave(LS_HISTORY, updatedHistory);

      if (isFirebaseConfigured && db) {
        try {
          const overridesRef = doc(db, MATRIX_OVERRIDES_DOC);
          if (category === 'all') {
            await setDoc(overridesRef, DEFAULT_OVERRIDES);
          } else {
            await setDoc(overridesRef, { [category]: {} }, { merge: true });
          }

          const ref = doc(db, MATRIX_DOC);
          await setDoc(ref, { history: updatedHistory }, { merge: true });

          // Collaborative live dashboard logging
          try {
            const dashboardCategoryMap: Record<OverrideCategory | 'all', string> = {
              all: "Coefficients & Structure",
              profession: "Profession PP",
              moral: "Activité P. Morales",
              country: "Pays",
              gov: "Gouvernorats",
              product: "Produits",
              dist: "Voie de distribution / Vente",
              sale: "Voie de distribution / Vente",
            };
            await addDoc(collection(db, "riskFactorLogs"), {
              date: new Date().toISOString(),
              user: author,
              factors: [dashboardCategoryMap[category] || category],
              note: category === 'all' 
                ? "Réinitialisation complète de toutes les personnalisations de la matrice KYC" 
                : `Réinitialisation de tous les paramètres personnalisés pour : ${category}`,
            });
          } catch (logErr) {
            console.error('[MatrixConfig] Failed to write live log:', logErr);
          }
        } catch (e) {
          console.error('[MatrixConfig] Reset overrides error:', e);
        }
      }
    },
    [overrides, kycHistory]
  );

  // ── Backward compatibility aliases ─────────────────────────────────────────
  const updateProfessionFactor = useCallback(
    async (professionName: string, field: string, value: boolean, author: string) => {
      await updateOverride('profession', professionName, field, value, author);
    },
    [updateOverride]
  );

  const resetProfessionOverrides = useCallback(
    async (author: string) => {
      await resetOverrides('profession', author);
    },
    [resetOverrides]
  );

  return (
    <MatrixConfigContext.Provider value={{
      kycFactors,
      kycHistory,
      loading,
      overrides,
      professionOverrides: overrides.profession,
      updateFactor,
      resetFactors,
      updateOverride,
      resetOverrides,
      updateProfessionFactor,
      resetProfessionOverrides
    }}>
      {children}
    </MatrixConfigContext.Provider>
  );
};

export const useMatrixConfig = () => {
  const ctx = useContext(MatrixConfigContext);
  if (!ctx) throw new Error('useMatrixConfig must be used within MatrixConfigProvider');
  return ctx;
};
