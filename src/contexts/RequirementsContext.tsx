"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ENTITY_REQUIREMENTS, EntityRequirement, DocumentItem } from "@/data/requirements";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

interface RequirementsContextType {
  requirements: EntityRequirement[];
  updateDocument: (categoryId: string, documentId: string, data: Partial<DocumentItem>) => void;
  resetToDefault: () => void;
}

const RequirementsContext = createContext<RequirementsContextType | undefined>(undefined);

export function RequirementsProvider({ children }: { children: ReactNode }) {
  const [requirements, setRequirements] = useState<EntityRequirement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isFirebaseConfigured && db) {
      // Connect to Firestore
      const docRef = doc(db, "settings", "guide_requirements");
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.requirements) {
            setRequirements(data.requirements);
          } else {
             setRequirements(ENTITY_REQUIREMENTS);
          }
        } else {
          // Document does not exist, initialize it
          setDoc(docRef, { requirements: ENTITY_REQUIREMENTS }).catch(console.error);
          setRequirements(ENTITY_REQUIREMENTS);
        }
        setIsLoaded(true);
      }, (error) => {
        console.error("Firebase RequirementsContext error:", error);
        loadLocalFallback();
      });

      return () => unsubscribe();
    } else {
      loadLocalFallback();
    }
  }, []);

  const loadLocalFallback = () => {
    const saved = localStorage.getItem("complianceRequirements");
    if (saved) {
      try {
        setRequirements(JSON.parse(saved));
      } catch (e) {
        setRequirements(ENTITY_REQUIREMENTS);
      }
    } else {
      setRequirements(ENTITY_REQUIREMENTS);
    }
    setIsLoaded(true);
  };

  const saveRequirements = (newRequirements: EntityRequirement[]) => {
    setRequirements(newRequirements); // Optimistic UI update
    
    if (isFirebaseConfigured && db) {
      const docRef = doc(db, "settings", "guide_requirements");
      setDoc(docRef, { requirements: newRequirements }).catch(console.error);
    } else {
      localStorage.setItem("complianceRequirements", JSON.stringify(newRequirements));
    }
  };

  const updateDocument = (categoryId: string, documentId: string, data: Partial<DocumentItem>) => {
    const newRequirements = requirements.map((cat) => {
      if (cat.id !== categoryId) return cat;

      return {
        ...cat,
        documents: cat.documents.map((doc) => {
          if (doc.id !== documentId) return doc;
          return { ...doc, ...data };
        }),
      };
    });

    saveRequirements(newRequirements);
  };

  const resetToDefault = () => {
    saveRequirements(ENTITY_REQUIREMENTS);
  };

  if (!isLoaded) {
    return null; // Await initial load
  }

  return (
    <RequirementsContext.Provider value={{ requirements, updateDocument, resetToDefault }}>
      {children}
    </RequirementsContext.Provider>
  );
}

export function useRequirements() {
  const context = useContext(RequirementsContext);
  if (context === undefined) {
    throw new Error("useRequirements must be used within a RequirementsProvider");
  }
  return context;
}

