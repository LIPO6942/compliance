'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    specialty: string;
    status: "Online" | "Away" | "Offline";
    expertise: string[];
    avatarUrl?: string;
}

const initialTeam: TeamMember[] = [
    {
        id: "1",
        name: "Moslem G.",
        role: "Direction Compliance & GRC",
        specialty: "Stratégie Réglementaire",
        status: "Online",
        expertise: ["Audit", "Anti-Corruption", "Risk Management"],
    },
    {
        id: "2",
        name: "Sarah L.",
        role: "Legal Counsel",
        specialty: "Protection des Données",
        status: "Online",
        expertise: ["RGPD", "Privacy by Design", "DPO"],
    },
    {
        id: "3",
        name: "Compliance AI",
        role: "Assistant Intelligent",
        specialty: "Analyse Sémantique",
        status: "Online",
        expertise: ["Veille 24/7", "Matching de Preuves", "Scoring"],
        avatarUrl: "/ai-avatar.png"
    },
    {
        id: "4",
        name: "Karim B.",
        role: "Risk Officer",
        specialty: "Lutte Anti-Blanchiment",
        status: "Away",
        expertise: ["LCB-FT", "Due Diligence", "Sanctions"],
    }
];

interface TeamContextType {
    teamMembers: TeamMember[];
    updateMember: (id: string, updates: Partial<TeamMember>) => void;
    addMember: (member: Omit<TeamMember, 'id'>) => void;
    removeMember: (id: string) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider = ({ children }: { children: ReactNode }) => {
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeam);

    // Persist to local storage for demo purposes if no backend
    useEffect(() => {
        const saved = localStorage.getItem('compliance_team');
        if (saved) {
            try {
                setTeamMembers(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load team from storage", e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('compliance_team', JSON.stringify(teamMembers));
    }, [teamMembers]);

    const updateMember = (id: string, updates: Partial<TeamMember>) => {
        setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    };

    const addMember = (member: Omit<TeamMember, 'id'>) => {
        const newMember = { ...member, id: Math.random().toString(36).substr(2, 9) };
        setTeamMembers(prev => [...prev, newMember]);
    };

    const removeMember = (id: string) => {
        setTeamMembers(prev => prev.filter(m => m.id !== id));
    };

    return (
        <TeamContext.Provider value={{ teamMembers, updateMember, addMember, removeMember }}>
            {children}
        </TeamContext.Provider>
    );
};

export const useTeam = () => {
    const context = useContext(TeamContext);
    if (context === undefined) {
        throw new Error('useTeam must be used within a TeamProvider');
    }
    return context;
};
