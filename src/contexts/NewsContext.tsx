
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import type { NewsItem } from '@/types/compliance';
import { fetchComplianceNews } from '@/ai/flows/news-flow';
import { useUser } from './UserContext';

interface NewsContextType {
  news: NewsItem[];
  loading: boolean;
  refetchNews: () => Promise<void>;
  dismissNewsItem: (id: string) => void;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export const NewsProvider = ({ children }: { children: ReactNode }) => {
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [dismissedNewsIds, setDismissedNewsIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLoaded } = useUser();
  const hasFetched = useRef(false);

  const loadNews = useCallback(async (force = false) => {
    if (hasFetched.current && !force) return;

    hasFetched.current = true;
    setLoading(true);
    try {
      const newsData = await fetchComplianceNews();
      setAllNews(newsData);
      setDismissedNewsIds([]); // Reset dismissed items on new fetch
    } catch (error) {
      console.error("Failed to fetch compliance news:", error);
      setAllNews([]); // Fallback to empty list on error
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

  const dismissNewsItem = (id: string) => {
    setDismissedNewsIds(prev => [...prev, id]);
  };

  const visibleNews = allNews.filter(item => !dismissedNewsIds.includes(item.id));

  return (
    <NewsContext.Provider value={{ news: visibleNews, loading, refetchNews, dismissNewsItem }}>
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
