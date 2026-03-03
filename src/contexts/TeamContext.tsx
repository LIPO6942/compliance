'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    specialty: string;
    status: "Online" | "Away" | "Offline";
    expertise: string[];
    avatarUrl?: string;
    email?: string;
    phone?: string;
}

const defaultTeam: TeamMember[] = [
    {
        id: "1",
        name: "Moslem G.",
        role: "Direction Compliance & GRC",
        specialty: "Stratégie Réglementaire",
        status: "Online",
        expertise: ["Audit", "Anti-Corruption", "Risk Management"],
        email: "moslem@compliancenav.com",
        phone: "+33 1 23 45 67 89"
    },
    {
        id: "2",
        name: "Sarah L.",
        role: "Legal Counsel",
        specialty: "Protection des Données",
        status: "Online",
        expertise: ["RGPD", "Privacy by Design", "DPO"],
        email: "sarah@compliancenav.com",
        phone: "+33 1 23 45 67 90"
    },
    {
        id: "3",
        name: "Compliance AI",
        role: "Assistant Intelligent",
        specialty: "Analyse Sémantique",
        status: "Online",
        expertise: ["Veille 24/7", "Matching de Preuves", "Scoring"],
        avatarUrl: "/ai-avatar.png",
        email: "ai@compliancenav.ai"
    },
    {
        id: "4",
        name: "Karim B.",
        role: "Risk Officer",
        specialty: "Lutte Anti-Blanchiment",
        status: "Away",
        expertise: ["LCB-FT", "Due Diligence", "Sanctions"],
        email: "karim@compliancenav.com",
        phone: "+33 1 23 45 67 91"
    }
];

interface TeamContextType {
    teamMembers: TeamMember[];
    updateMember: (id: string, updates: Partial<TeamMember>) => void;
    addMember: (member: Omit<TeamMember, 'id'>) => void;
    removeMember: (id: string) => void;
    isLoading: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider = ({ children }: { children: ReactNode }) => {
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load team data from Firestore with real-time sync
    useEffect(() => {
        if (!isFirebaseConfigured || !db) {
            // Fallback to localStorage if Firebase not configured
            console.warn("Firebase not configured, using localStorage fallback");
            const saved = localStorage.getItem('compliance_team');
            if (saved) {
                try {
                    setTeamMembers(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to load team from storage", e);
                    setTeamMembers(defaultTeam);
                }
            } else {
                setTeamMembers(defaultTeam);
            }
            setIsLoading(false);
            return;
        }

        // Load from Firestore with real-time subscription
        const unsubscribe = onSnapshot(
            collection(db, 'team'),
            (snapshot) => {
                if (snapshot.empty) {
                    // Initialize Firestore with default team on first load
                    if (!isInitialized) {
                        initializeFirestoreTeam();
                        setIsInitialized(true);
                    }
                } else {
                    const members = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as TeamMember));
                    setTeamMembers(members);
                }
                setIsLoading(false);
            },
            (error) => {
                console.error("Error loading team from Firestore:", error);
                // Fallback to localStorage
                const saved = localStorage.getItem('compliance_team');
                if (saved) {
                    try {
                        setTeamMembers(JSON.parse(saved));
                    } catch (e) {
                        setTeamMembers(defaultTeam);
                    }
                } else {
                    setTeamMembers(defaultTeam);
                }
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [isInitialized]);

    // Initialize Firestore with default team
    const initializeFirestoreTeam = async () => {
        if (!db) return;
        try {
            const batch = writeBatch(db);
            defaultTeam.forEach((member) => {
                const docRef = doc(db, 'team', member.id);
                batch.set(docRef, member);
            });
            await batch.commit();
            setTeamMembers(defaultTeam);
        } catch (error) {
            console.error("Error initializing Firestore team:", error);
            setTeamMembers(defaultTeam);
        }
    };

    const updateMember = async (id: string, updates: Partial<TeamMember>) => {
        if (!db) {
            // Fallback to local state only
            setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
            return;
        }

        try {
            const memberRef = doc(db, 'team', id);
            await setDoc(memberRef, updates, { merge: true });
            // Local state will be updated via the Firestore listener
        } catch (error) {
            console.error("Error updating member:", error);
        }
    };

    const addMember = async (member: Omit<TeamMember, 'id'>) => {
        const newMemberId = Math.random().toString(36).substr(2, 9);
        const newMember: TeamMember = { ...member, id: newMemberId };

        if (!db) {
            // Fallback to local state only
            setTeamMembers(prev => [...prev, newMember]);
            return;
        }

        try {
            const memberRef = doc(db, 'team', newMemberId);
            await setDoc(memberRef, newMember);
            // Local state will be updated via the Firestore listener
        } catch (error) {
            console.error("Error adding member:", error);
        }
    };

    const removeMember = async (id: string) => {
        if (!db) {
            // Fallback to local state only
            setTeamMembers(prev => prev.filter(m => m.id !== id));
            return;
        }

        try {
            await deleteDoc(doc(db, 'team', id));
            // Local state will be updated via the Firestore listener
        } catch (error) {
            console.error("Error removing member:", error);
        }
    };

    return (
        <TeamContext.Provider value={{ teamMembers, updateMember, addMember, removeMember, isLoading }}>
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
