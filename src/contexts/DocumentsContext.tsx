
'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Document, DocumentStatus } from '@/types/compliance';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { useUser } from './UserContext'; // Assuming a user context exists for auth state

const documentsCollectionName = "documents";

interface DocumentsContextType {
  documents: Document[];
  loading: boolean;
  updateDocumentStatus: (documentId: string, newStatus: Document['status']) => Promise<void>;
  addDocument: (document: Omit<Document, 'id' | 'status' | 'lastUpdated'>) => Promise<void>;
  editDocument: (documentId: string, documentUpdate: Partial<Omit<Document, 'id' | 'status' | 'lastUpdated'>>) => Promise<void>;
  removeDocument: (documentId: string) => Promise<void>;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

export const DocumentsProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isLoaded } = useUser(); // Using a mock user for now

  useEffect(() => {
    if (!isLoaded) return; // Wait for user to be loaded

    const q = query(collection(db, documentsCollectionName), orderBy("lastUpdated", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const documentsData: Document[] = [];
      querySnapshot.forEach((doc) => {
        documentsData.push({ id: doc.id, ...doc.data() } as Document);
      });
      setDocuments(documentsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching documents: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isLoaded]);

  const updateDocumentStatus = async (documentId: string, newStatus: DocumentStatus) => {
    const docRef = doc(db, documentsCollectionName, documentId);
    await updateDoc(docRef, {
      status: newStatus,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  };

  const addDocument = async (document: Omit<Document, 'id' | 'status' | 'lastUpdated'>) => {
    await addDoc(collection(db, documentsCollectionName), {
      ...document,
      status: 'En Révision',
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  };

  const editDocument = async (documentId: string, documentUpdate: Partial<Omit<Document, 'id' | 'status' | 'lastUpdated'>>) => {
    const docRef = doc(db, documentsCollectionName, documentId);
    await updateDoc(docRef, {
      ...documentUpdate,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  };

  const removeDocument = async (documentId: string) => {
    await deleteDoc(doc(db, documentsCollectionName, documentId));
  };


  return (
    <DocumentsContext.Provider value={{ documents, loading, updateDocumentStatus, addDocument, editDocument, removeDocument }}>
      {children}
    </DocumentsContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentsContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentsProvider');
  }
  return context;
};
