
'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { Document, DocumentStatus } from '@/types/compliance';
import { initialMockDocuments } from '@/data/mockDocuments'; // Utilisé UNIQUEMENT en mode démo (Firebase non configuré)
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { useUser } from './UserContext';

export type DataStatus = "loading" | "real" | "demo" | "error" | "empty";

const documentsCollectionName = "documents";

interface DocumentsContextType {
  documents: Document[];
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
  updateDocumentStatus: (documentId: string, newStatus: Document['status']) => Promise<void>;
  addDocument: (document: Omit<Document, 'id' | 'status' | 'lastUpdated'>) => Promise<void>;
  editDocument: (documentId: string, documentUpdate: Partial<Omit<Document, 'id' | 'status' | 'lastUpdated'>>) => Promise<void>;
  removeDocument: (documentId: string) => Promise<void>;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

export const DocumentsProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataStatus, setDataStatus] = useState<DataStatus>("loading");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [retryKey, setRetryKey] = useState(0);
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
      setDocuments(initialMockDocuments);
      setDataStatus("demo");
      setLoading(false);
      console.warn("[Documents] Firebase non configuré — Mode Démonstration actif. Données fictives affichées.");
      return;
    }

    // ── Cas 2 : Firebase configuré → souscription temps réel ────────────────
    setLoading(true);
    const documentsRef = collection(db, documentsCollectionName);
    const q = query(documentsRef, orderBy("lastUpdated", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {

      // ── Cas 2a : Collection réellement vide ─────────────────────────────
      // NE PAS injecter de données fictives. Afficher liste vide.
      if (querySnapshot.empty) {
        setDocuments([]);
        setDataStatus("empty");
        setLastSyncAt(new Date());
        setLoading(false);
        console.info("[Documents] Collection Firebase vide — aucune donnée fictive injectée.");
        return;
      }

      // ── Cas 2b : Données réelles reçues ─────────────────────────────────
      const documentsData: Document[] = querySnapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      } as Document));
      setDocuments(documentsData);
      setDataStatus("real");
      setLastSyncAt(new Date());
      setLoading(false);

    }, (error) => {
      // ── Cas 2c : Erreur Firebase ────────────────────────────────────────
      // IMPORTANT : NE PAS remplacer les données par des données fictives.
      // Les données précédemment chargées sont conservées en mémoire.
      console.error("[Documents] Erreur Firebase onSnapshot:", error.code, error.message);
      setDataStatus("error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isLoaded, retryKey]);

  // ── CRUD — inchangé, sécurisé par la garde isFirebaseConfigured ──────────

  const updateDocumentStatus = async (documentId: string, newStatus: DocumentStatus) => {
    if (!isFirebaseConfigured || !db) return;
    const docRef = doc(db, documentsCollectionName, documentId);
    await updateDoc(docRef, {
      status: newStatus,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  };

  const addDocument = async (document: Omit<Document, 'id' | 'status' | 'lastUpdated'>) => {
    if (!isFirebaseConfigured || !db) return;
    await addDoc(collection(db, documentsCollectionName), {
      ...document,
      status: 'En Révision',
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  };

  const editDocument = async (documentId: string, documentUpdate: Partial<Omit<Document, 'id' | 'status' | 'lastUpdated'>>) => {
    if (!isFirebaseConfigured || !db) return;
    const docRef = doc(db, documentsCollectionName, documentId);
    await updateDoc(docRef, {
      ...documentUpdate,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  };

  const removeDocument = async (documentId: string) => {
    if (!isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, documentsCollectionName, documentId));
  };

  return (
    <DocumentsContext.Provider value={{
      documents,
      loading,
      dataStatus,
      lastSyncAt,
      retrySync,
      updateDocumentStatus,
      addDocument,
      editDocument,
      removeDocument,
    }}>
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
