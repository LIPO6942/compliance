"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ENTITY_REQUIREMENTS, EntityRequirement, DocumentItem } from "@/data/requirements";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

interface RequirementsContextType {
  requirements: EntityRequirement[];
  updateDocument: (categoryId: string, documentId: string, data: Partial<DocumentItem>) => void;
  addDocumentItem: (categoryId: string) => void;
  reorderDocumentItem: (categoryId: string, docId: string, direction: 'up' | 'down') => void;
  addCategory: () => void;
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
    
    // Nettoyer les valeurs undefined car Firestore va rejeter le document avec une erreur silencieuse sinon.
    const cleanRequirements = JSON.parse(JSON.stringify(newRequirements));

    if (isFirebaseConfigured && db) {
      const docRef = doc(db, "settings", "guide_requirements");
      setDoc(docRef, { requirements: cleanRequirements }).catch(console.error);
    } else {
      localStorage.setItem("complianceRequirements", JSON.stringify(cleanRequirements));
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

  const addDocumentItem = (categoryId: string) => {
    const newRequirements = requirements.map((cat) => {
      if (cat.id !== categoryId) return cat;
      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        name: "Nouvelle Étape Documentaire",
        description: "Description de l'étape",
        requirements: ["Nouvelle exigence de données"],
        alertType: "Alerte Non-Conformité"
      };
      return { ...cat, documents: [...cat.documents, newDoc] };
    });
    saveRequirements(newRequirements);
  };

  const reorderDocumentItem = (categoryId: string, docId: string, direction: 'up' | 'down') => {
    const newRequirements = requirements.map((cat) => {
      if (cat.id !== categoryId) return cat;
      const docIndex = cat.documents.findIndex(d => d.id === docId);
      if (docIndex < 0) return cat;
      
      const newDocs = [...cat.documents];
      if (direction === 'up' && docIndex > 0) {
        [newDocs[docIndex - 1], newDocs[docIndex]] = [newDocs[docIndex], newDocs[docIndex - 1]];
      } else if (direction === 'down' && docIndex < newDocs.length - 1) {
        [newDocs[docIndex + 1], newDocs[docIndex]] = [newDocs[docIndex], newDocs[docIndex + 1]];
      }
      return { ...cat, documents: newDocs };
    });
    saveRequirements(newRequirements);
  };

  const addCategory = () => {
    const newCategory: EntityRequirement = {
      id: `cat-${Date.now()}`,
      type: "Nouvel Organe",
      icon: "Building2",
      description: "Description du nouvel organe ou entité.",
      documents: []
    };
    saveRequirements([...requirements, newCategory]);
  };

  const resetToDefault = () => {
    saveRequirements(ENTITY_REQUIREMENTS);
  };

  if (!isLoaded) {
    return null; // Await initial load
  }

  return (
    <RequirementsContext.Provider value={{ requirements, updateDocument, addDocumentItem, reorderDocumentItem, addCategory, resetToDefault }}>
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

