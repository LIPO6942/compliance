'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from "firebase/firestore";

export interface TimelineEvent {
    id: string;
    date: string;
    title: string;
    category: string;
    color: string;
    validated?: boolean;
}

interface TimelineContextType {
    events: TimelineEvent[];
    loading: boolean;
    addEvent: (event: Omit<TimelineEvent, 'id' | 'validated'>) => void;
    updateEvent: (event: TimelineEvent) => void;
    deleteEvent: (id: string) => void;
    toggleValidation: (id: string) => void;
}

const STORAGE_KEY = 'compliance_timeline_events';
const FIRESTORE_PATH = 'appData/timeline';

const defaultEvents: TimelineEvent[] = [
    { id: 'evt-1', date: '2026-03-31', title: 'Rapport Annuel LCB-FT', category: 'ACPR', color: 'bg-rose-500', validated: false },
    { id: 'evt-2', date: '2026-04-15', title: 'Revue Procédures KYC', category: 'Interne', color: 'bg-blue-500', validated: false },
    { id: 'evt-3', date: '2026-06-30', title: 'Audit Conformité DORA', category: 'AMF', color: 'bg-amber-500', validated: false },
];

const TimelineContext = createContext<TimelineContextType | undefined>(undefined);

export const TimelineProvider = ({ children }: { children: ReactNode }) => {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // Load from Firebase or localStorage
    useEffect(() => {
        if (isFirebaseConfigured && db) {
            const docRef = doc(db, FIRESTORE_PATH);
            const unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    setEvents(docSnap.data().events ?? defaultEvents);
                } else {
                    setDoc(docRef, { events: defaultEvents });
                    setEvents(defaultEvents);
                }
                setLoading(false);
            }, (error) => {
                console.error("TimelineContext: Firebase error, falling back to localStorage:", error);
                loadFromLocalStorage();
            });
            return () => unsubscribe();
        } else {
            loadFromLocalStorage();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadFromLocalStorage = () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setEvents(JSON.parse(stored));
            } else {
                setEvents(defaultEvents);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultEvents));
            }
        } catch (e) {
            setEvents(defaultEvents);
        } finally {
            setLoading(false);
        }
    };

    const persist = async (newEvents: TimelineEvent[]) => {
        if (isFirebaseConfigured && db) {
            try {
                await setDoc(doc(db, FIRESTORE_PATH), { events: newEvents });
            } catch (e) {
                console.error("TimelineContext: Failed to save to Firebase:", e);
                // Fallback to localStorage
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newEvents));
            }
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newEvents));
        }
    };

    const addEvent = (event: Omit<TimelineEvent, 'id' | 'validated'>) => {
        const newEvent: TimelineEvent = {
            ...event,
            id: `evt-${Date.now()}`,
            validated: false,
        };
        const updated = [...events, newEvent];
        setEvents(updated);
        persist(updated);
    };

    const updateEvent = (event: TimelineEvent) => {
        const updated = events.map(e => e.id === event.id ? event : e);
        setEvents(updated);
        persist(updated);
    };

    const deleteEvent = (id: string) => {
        const updated = events.filter(e => e.id !== id);
        setEvents(updated);
        persist(updated);
    };

    const toggleValidation = (id: string) => {
        const updated = events.map(e =>
            e.id === id ? { ...e, validated: !e.validated } : e
        );
        setEvents(updated);
        persist(updated);
    };

    return (
        <TimelineContext.Provider value={{ events, loading, addEvent, updateEvent, deleteEvent, toggleValidation }}>
            {children}
        </TimelineContext.Provider>
    );
};

export const useTimeline = () => {
    const context = useContext(TimelineContext);
    if (context === undefined) {
        throw new Error('useTimeline must be used within a TimelineProvider');
    }
    return context;
};
