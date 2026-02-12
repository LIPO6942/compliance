
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { CustomKeyword } from '@/types/compliance';
import { initialMockKeywords } from '@/data/mockKeywords';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useUser } from './UserContext';
import { useToast } from "@/hooks/use-toast";

const keywordsDocumentPath = "keywords/main";

interface KeywordsContextType {
  keywords: CustomKeyword[];
  loading: boolean;
  addKeyword: (label: string) => Promise<void>;
  removeKeyword: (keywordId: string) => Promise<void>;
}

const KeywordsContext = createContext<KeywordsContextType | undefined>(undefined);

export const KeywordsProvider = ({ children }: { children: ReactNode }) => {
  const [keywords, setKeywords] = useState<CustomKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLoaded } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isFirebaseConfigured || !db) {
      setKeywords(initialMockKeywords);
      setLoading(false);
      console.warn("Firebase not configured. Keywords will use mock data.");
      return;
    }

    const keywordsDocRef = doc(db, keywordsDocumentPath);
    const unsubscribe = onSnapshot(keywordsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setKeywords(docSnap.data().list ?? []);
      } else {
        // If the document doesn't exist, create it with initial data
        setDoc(keywordsDocRef, { list: initialMockKeywords });
        setKeywords(initialMockKeywords);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching keywords, falling back to mock data: ", error);
      setKeywords(initialMockKeywords);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isLoaded]);
  
  const updateKeywordsInFirestore = async (newKeywords: CustomKeyword[]) => {
      if (!isFirebaseConfigured || !db) return;
      const keywordsDocRef = doc(db, keywordsDocumentPath);
      await setDoc(keywordsDocRef, { list: newKeywords });
  }

  const addKeyword = async (label: string) => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;
    
    if (keywords.some(k => k.label.toLowerCase() === trimmedLabel.toLowerCase())) {
        toast({
            variant: "destructive",
            title: "Mot-clé existant",
            description: "Ce mot-clé existe déjà dans la liste.",
        });
        return;
    }

    const newKeyword: CustomKeyword = {
      id: trimmedLabel, // Use label as ID for simplicity
      label: trimmedLabel,
    };
    const updatedKeywords = [...keywords, newKeyword];
    await updateKeywordsInFirestore(updatedKeywords);
  };

  const removeKeyword = async (keywordId: string) => {
    const updatedKeywords = keywords.filter(k => k.id !== keywordId);
    await updateKeywordsInFirestore(updatedKeywords);
  };

  return (
    <KeywordsContext.Provider value={{ keywords, loading, addKeyword, removeKeyword }}>
      {children}
    </KeywordsContext.Provider>
  );
};

export const useKeywords = () => {
  const context = useContext(KeywordsContext);
  if (context === undefined) {
    throw new Error('useKeywords must be used within a KeywordsProvider');
  }
  return context;
};
