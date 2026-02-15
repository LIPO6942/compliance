"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface TimelineEvent {
    id: string;
    date: string;
    title: string;
    category: string;
    color: string;
}

interface TimelineContextType {
    events: TimelineEvent[];
    updateEvent: (updatedEvent: TimelineEvent) => void;
    addEvent: (event: Omit<TimelineEvent, 'id'>) => void;
    deleteEvent: (id: string) => void;
}

const defaultEvents: TimelineEvent[] = [
    { id: '1', date: "15 MAR", title: "Rapport Annuel LCB-FT", category: "Réglementaire", color: "bg-blue-500" },
    { id: '2', date: "01 JUIN", title: "Audit ISO 37301", category: "Certification", color: "bg-emerald-500" },
    { id: '3', date: "12 OCT", title: "Revue Due Diligence", category: "Tiers", color: "bg-amber-500" }
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

    return (
        <TimelineContext.Provider value={{ events, updateEvent, addEvent, deleteEvent }}>
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
