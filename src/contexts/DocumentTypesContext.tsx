
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { DocumentTypeInfo } from '@/types/compliance';
import { initialMockDocumentTypes } from '@/data/mockDocumentTypes';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useUser } from './UserContext';
import { useToast } from "@/hooks/use-toast";
import { useDocuments } from './DocumentsContext'; // Import useDocuments

const documentTypesDocumentPath = "documentData/types";

interface DocumentTypesContextType {
  documentTypes: DocumentTypeInfo[];
  loading: boolean;
  addDocumentType: (label: string) => Promise<void>;
  editDocumentType: (typeId: string, newLabel: string) => Promise<void>;
  removeDocumentType: (typeId: string) => Promise<void>;
}

const DocumentTypesContext = createContext<DocumentTypesContextType | undefined>(undefined);

export const DocumentTypesProvider = ({ children }: { children: ReactNode }) => {
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLoaded } = useUser();
  const { documents } = useDocuments(); // Get documents to check for usage
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isFirebaseConfigured || !db) {
      setDocumentTypes(initialMockDocumentTypes);
      setLoading(false);
      console.warn("Firebase not configured. Document types will use mock data.");
      return;
    }

    const docRef = doc(db, documentTypesDocumentPath);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setDocumentTypes(docSnap.data().list ?? []);
      } else {
        setDoc(docRef, { list: initialMockDocumentTypes });
        setDocumentTypes(initialMockDocumentTypes);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching document types, falling back to mock data: ", error);
      setDocumentTypes(initialMockDocumentTypes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isLoaded]);
  
  const updateTypesInFirestore = async (newTypes: DocumentTypeInfo[]) => {
      if (!isFirebaseConfigured || !db) return;
      const docRef = doc(db, documentTypesDocumentPath);
      await setDoc(docRef, { list: newTypes });
  }

  const addDocumentType = async (label: string) => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;
    
    if (documentTypes.some(t => t.label.toLowerCase() === trimmedLabel.toLowerCase())) {
        toast({
            variant: "destructive",
            title: "Type existant",
            description: "Ce type de document existe déjà.",
        });
        return;
    }

    const newType: DocumentTypeInfo = {
      id: trimmedLabel.toLowerCase().replace(/\s+/g, '-'),
      label: trimmedLabel,
    };
    const updatedTypes = [...documentTypes, newType];
    await updateTypesInFirestore(updatedTypes);
  };
  
  const editDocumentType = async (typeId: string, newLabel: string) => {
    const trimmedLabel = newLabel.trim();
    if (!trimmedLabel) return;

    if (documentTypes.some(t => t.label.toLowerCase() === trimmedLabel.toLowerCase() && t.id !== typeId)) {
        toast({ variant: "destructive", title: "Type existant", description: "Ce nom de type est déjà utilisé." });
        return;
    }
    
    const updatedTypes = documentTypes.map(t => t.id === typeId ? { ...t, label: trimmedLabel } : t);
    await updateTypesInFirestore(updatedTypes);
  };

  const removeDocumentType = async (typeId: string) => {
    // Check if the type is being used by any document
    const isTypeInUse = documents.some(doc => doc.type === typeId);

    if (isTypeInUse) {
      const error = new Error("Ce type est actuellement utilisé par un ou plusieurs documents. Vous ne pouvez pas le supprimer.");
      toast({
          variant: "destructive",
          title: "Suppression impossible",
          description: error.message,
      });
      throw error;
    }
    
    const updatedTypes = documentTypes.filter(t => t.id !== typeId);
    await updateTypesInFirestore(updatedTypes);
  };

  return (
    <DocumentTypesContext.Provider value={{ documentTypes, loading, addDocumentType, editDocumentType, removeDocumentType }}>
      {children}
    </DocumentTypesContext.Provider>
  );
};

export const useDocumentTypes = () => {
  const context = useContext(DocumentTypesContext);
  if (context === undefined) {
    throw new Error('useDocumentTypes must be used within a DocumentTypesProvider');
  }
  return context;
};
