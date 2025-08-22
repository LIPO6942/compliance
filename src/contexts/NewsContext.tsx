
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import type { NewsItem } from '@/types/compliance';
import { fetchComplianceNews } from '@/ai/flows/news-flow';
import { useUser } from './UserContext';

interface NewsContextType {
  news: NewsItem[];
  loading: boolean;
  refetchNews: () => Promise<void>;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export const NewsProvider = ({ children }: { children: ReactNode }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLoaded } = useUser();
  const hasFetched = useRef(false);

  const loadNews = useCallback(async (force = false) => {
    if (hasFetched.current && !force) return;

    hasFetched.current = true;
    setLoading(true);
    try {
      const newsData = await fetchComplianceNews();
      setNews(newsData);
    } catch (error) {
      console.error("Failed to fetch compliance news:", error);
      setNews([]); // Fallback to empty list on error
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchNews = useCallback(async () => {
    await loadNews(true);
  }, [loadNews]);
  
  useEffect(() => {
    if (!isLoaded || hasFetched.current) {
      return;
    }
    loadNews();
  }, [isLoaded, loadNews]);

  return (
    <NewsContext.Provider value={{ news, loading, refetchNews }}>
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
