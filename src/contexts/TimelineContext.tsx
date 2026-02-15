"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

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
    updateEvent: (updatedEvent: TimelineEvent) => void;
    addEvent: (event: Omit<TimelineEvent, 'id' | 'validated'>) => void;
    deleteEvent: (id: string) => void;
    toggleValidation: (id: string) => void;
}

const defaultEvents: TimelineEvent[] = [
    { id: '1', date: "2026-03-15", title: "Rapport Annuel LCB-FT", category: "Réglementaire", color: "bg-blue-500", validated: false },
    { id: '2', date: "2026-06-01", title: "Audit ISO 37301", category: "Certification", color: "bg-emerald-500", validated: false },
    { id: '3', date: "2026-10-12", title: "Revue Due Diligence", category: "Tiers", color: "bg-amber-500", validated: false }
];

const TimelineContext = createContext<TimelineContextType | undefined>(undefined);

export const TimelineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [events, setEvents] = useState<TimelineEvent[]>(defaultEvents);

    const updateEvent = (updatedEvent: TimelineEvent) => {
        setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    };

    const addEvent = (event: Omit<TimelineEvent, 'id'>) => {
        const newEvent = { ...event, id: Math.random().toString(36).substr(2, 9) };
        setEvents(prev => [...prev, newEvent]);
    };

    const deleteEvent = (id: string) => {
        setEvents(prev => prev.filter(e => e.id !== id));
    };

    const toggleValidation = (id: string) => {
        setEvents(prev => prev.map(e => e.id === id ? { ...e, validated: !e.validated } : e));
    };

    return (
        <TimelineContext.Provider value={{ events, updateEvent, addEvent, deleteEvent, toggleValidation }}>
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
