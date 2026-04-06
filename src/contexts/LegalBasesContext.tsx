"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { LegalBaseText } from "@/types/legal-base";
import { LEGAL_KNOWLEDGE_BASE } from "@/ai/constants/knowledge-base";

interface LegalBasesContextType {
  legalBases: LegalBaseText[];
  addLegalBase: (base: Omit<LegalBaseText, "id">) => void;
  updateLegalBase: (id: string, data: Partial<LegalBaseText>) => void;
  deleteLegalBase: (id: string) => void;
  reorderLegalBases?: (id: string, direction: 'up' | 'down') => void;
}

const LegalBasesContext = createContext<LegalBasesContextType | undefined>(undefined);

// Un seed par défaut à partir de la variable codée en dur.
const defaultBases: LegalBaseText[] = [
  {
    id: "base-init",
    title: "Savoir Réglementaire Initial",
    source: "Règlement CGA n°2/2019 & LD",
    category: "Lignes directrices",
    content: LEGAL_KNOWLEDGE_BASE,
    isActive: true,
  }
];

export function LegalBasesProvider({ children }: { children: ReactNode }) {
  const [legalBases, setLegalBases] = useState<LegalBaseText[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isFirebaseConfigured && db) {
      const docRef = doc(db, "settings", "legal_bases");
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.bases) {
            setLegalBases(data.bases);
          } else {
            setLegalBases(defaultBases);
          }
        } else {
          // Document does not exist, initialize it
          setDoc(docRef, { bases: defaultBases }).catch(console.error);
          setLegalBases(defaultBases);
        }
        setIsLoaded(true);
      }, (error) => {
        console.error("Firebase LegalBasesContext error:", error);
        loadLocalFallback();
      });

      return () => unsubscribe();
    } else {
      loadLocalFallback();
    }
  }, []);

  const loadLocalFallback = () => {
    const saved = localStorage.getItem("legalBasesData");
    if (saved) {
      try {
        setLegalBases(JSON.parse(saved));
      } catch (e) {
        setLegalBases(defaultBases);
      }
    } else {
      setLegalBases(defaultBases);
    }
    setIsLoaded(true);
  };

  const saveBases = (newBases: LegalBaseText[]) => {
    setLegalBases(newBases); // Optimistic UI update
    
    // Nettoyer les valeurs undefined
    const cleanBases = JSON.parse(JSON.stringify(newBases));

    if (isFirebaseConfigured && db) {
      const docRef = doc(db, "settings", "legal_bases");
      setDoc(docRef, { bases: cleanBases }, { merge: true }).catch(console.error);
    } else {
      localStorage.setItem("legalBasesData", JSON.stringify(cleanBases));
    }
  };

  const addLegalBase = (base: Omit<LegalBaseText, "id">) => {
    const newBase: LegalBaseText = {
      ...base,
      id: `lb-${Date.now()}`
    };
    saveBases([...legalBases, newBase]);
  };

  const updateLegalBase = (id: string, data: Partial<LegalBaseText>) => {
    const newBases = legalBases.map((lb) => {
      if (lb.id !== id) return lb;
      return { ...lb, ...data };
    });
    saveBases(newBases);
  };

  const deleteLegalBase = (id: string) => {
    const newBases = legalBases.filter((lb) => lb.id !== id);
    saveBases(newBases);
  };

  if (!isLoaded) {
    return null; // Await initial load
  }

  return (
    <LegalBasesContext.Provider value={{ legalBases, addLegalBase, updateLegalBase, deleteLegalBase }}>
      {children}
    </LegalBasesContext.Provider>
  );
}

export function useLegalBases() {
  const context = useContext(LegalBasesContext);
  if (context === undefined) {
    throw new Error("useLegalBases must be used within a LegalBasesProvider");
  }
  return context;
}
