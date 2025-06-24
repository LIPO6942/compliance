
'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Document, DocumentStatus } from '@/types/compliance';
import { initialMockDocuments } from '@/data/mockDocuments';

interface DocumentsContextType {
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  updateDocumentStatus: (documentId: string, newStatus: Document['status']) => void;
  addDocument: (document: Omit<Document, 'id' | 'status' | 'lastUpdated'>) => void;
  editDocument: (documentId: string, documentUpdate: Partial<Omit<Document, 'id' | 'status' | 'lastUpdated'>>) => void;
  removeDocument: (documentId: string) => void;
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
  
  const updateDocumentStatus = (documentId: string, newStatus: DocumentStatus) => {
    setDocuments(prevDocuments =>
      prevDocuments.map(doc =>
        doc.id === documentId ? { ...doc, status: newStatus, lastUpdated: new Date().toISOString().split('T')[0] } : doc
      )
    );
  };

  const addDocument = (document: Omit<Document, 'id' | 'status' | 'lastUpdated'>) => {
    const newDocument: Document = {
      ...document,
      id: Date.now().toString(),
      status: 'En Révision', // Default status for new documents
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setDocuments(prev => [newDocument, ...prev]);
  };

  const editDocument = (documentId: string, documentUpdate: Partial<Omit<Document, 'id' | 'status' | 'lastUpdated'>>) => {
    setDocuments(prev => prev.map(doc =>
      doc.id === documentId ? { 
        ...doc, 
        ...documentUpdate,
        lastUpdated: new Date().toISOString().split('T')[0]
      } : doc
    ));
  };

  const removeDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };


  return (
    <DocumentsContext.Provider value={{ documents, setDocuments, updateDocumentStatus, addDocument, editDocument, removeDocument }}>
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
