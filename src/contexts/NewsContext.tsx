
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import type { NewsItem } from '@/types/compliance';
import { fetchComplianceNews } from '@/ai/flows/news-flow';
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
  const hasFetched = useRef(false);

  useEffect(() => {
    // Only run if the user is loaded and we haven't fetched yet
    if (!isLoaded || hasFetched.current) {
      return;
    }

    const loadNews = async () => {
      // Set the flag to true immediately to prevent re-fetching
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
    };
    
    loadNews();
    
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
