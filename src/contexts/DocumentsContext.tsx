
'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Document } from '@/types/compliance';
import { initialMockDocuments } from '@/data/mockDocuments'; // Using the new data file

interface DocumentsContextType {
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  updateDocumentStatus: (documentId: string, newStatus: Document['status']) => void;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

export const DocumentsProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<Document[]>(() => {
     if (typeof window !== 'undefined') {
      const savedDocuments = localStorage.getItem('documents');
      return savedDocuments ? JSON.parse(savedDocuments) : initialMockDocuments;
    }
    return initialMockDocuments;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
     localStorage.setItem('documents', JSON.stringify(documents));
    }
  }, [documents]);
  
  const updateDocumentStatus = (documentId: string, newStatus: Document['status']) => {
    setDocuments(prevDocuments =>
      prevDocuments.map(doc =>
        doc.id === documentId ? { ...doc, status: newStatus, lastUpdated: new Date().toISOString().split('T')[0] } : doc
      )
    );
  };

  return (
    <DocumentsContext.Provider value={{ documents, setDocuments, updateDocumentStatus }}>
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
