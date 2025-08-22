
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { NewsItem } from '@/types/compliance';
import { initialMockNews } from '@/data/mockNews';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useUser } from './UserContext';

interface NewsContextType {
  news: NewsItem[];
  loading: boolean;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export const NewsProvider = ({ children }: { children: ReactNode }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLoaded } = useUser();

  useEffect(() => {
    // For this prototype, we'll stick to mock data as a real news feed is complex.
    // The structure is here to easily switch to Firebase if needed.
    if (!isLoaded) return;
    
    setNews(initialMockNews);
    setLoading(false);
    
  }, [isLoaded]);

  return (
    <NewsContext.Provider value={{ news, loading }}>
      {children}
    </NewsContext.Provider>
  );
};

export const useNews = () => {
  const context = useContext(NewsContext);
  if (context === undefined) {
    throw new Error('useNews must be used within a NewsProvider');
  }
  return context;
};

    