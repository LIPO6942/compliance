'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp, Timestamp } from 'firebase/firestore';

export type ActivityAction =
    | 'LOGIN'         // User selected their identity
    | 'LOGOUT'        // User switched away
    | 'RISK_ADD'
    | 'RISK_EDIT'
    | 'RISK_DELETE'
    | 'DOCUMENT_ADD'
    | 'DOCUMENT_EDIT'
    | 'DOCUMENT_DELETE'
    | 'DOCUMENT_STATUS'
    | 'ALERT_CREATE'
    | 'ALERT_REMOVE'
    | 'PLAN_UPDATE'
    | 'SETTINGS_UPDATE'
    | 'OTHER';

export interface ActivityEntry {
    id?: string;
    timestamp: string;       // ISO string for local fallback
    userEmail: string;
    userName: string;
    action: ActivityAction;
    label: string;           // Human-readable description
    detail?: string;         // Extra detail (e.g. document name)
    module: string;          // Page/module name
}

interface ActivityLogContextType {
    logs: ActivityEntry[];
    logAction: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void;
    isAdmin: (email: string) => boolean;
}

const ADMIN_EMAIL = 'moslem.gouia@mae.tn';
const LOCAL_KEY = 'compliance_activity_log';
const MAX_LOCAL_LOGS = 200;

const ActivityLogContext = createContext<ActivityLogContextType | undefined>(undefined);

export const ActivityLogProvider = ({ children }: { children: ReactNode }) => {
    const [logs, setLogs] = useState<ActivityEntry[]>([]);

    // Load from Firestore or localStorage
    useEffect(() => {
        if (isFirebaseConfigured && db) {
            const q = query(
                collection(db, 'activity_logs'),
                orderBy('serverTimestamp', 'desc'),
                limit(500)
            );
            const unsub = onSnapshot(q, (snap) => {
                const entries: ActivityEntry[] = snap.docs.map(doc => ({
                    id: doc.id,
                    ...(doc.data() as Omit<ActivityEntry, 'id'>),
                }));
                setLogs(entries);
            }, (err) => {
                console.warn('ActivityLog Firestore error, falling back to localStorage', err);
                loadFromLocal();
            });
            return () => unsub();
        } else {
            loadFromLocal();
        }
    }, []);

    const loadFromLocal = () => {
        try {
            const saved = localStorage.getItem(LOCAL_KEY);
            if (saved) setLogs(JSON.parse(saved));
        } catch { /* ignore */ }
    };

    const logAction = useCallback((entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => {
        const now = new Date().toISOString();
        const full: ActivityEntry = { ...entry, timestamp: now };

        if (isFirebaseConfigured && db) {
            addDoc(collection(db, 'activity_logs'), {
                ...full,
                serverTimestamp: serverTimestamp(),
            }).catch(console.error);
        } else {
            // Persist to localStorage (cap at MAX_LOCAL_LOGS)
            setLogs(prev => {
                const updated = [full, ...prev].slice(0, MAX_LOCAL_LOGS);
                try { localStorage.setItem(LOCAL_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
                return updated;
            });
        }
    }, []);

    const isAdmin = useCallback((email: string) => email === ADMIN_EMAIL, []);

    return (
        <ActivityLogContext.Provider value={{ logs, logAction, isAdmin }}>
            {children}
        </ActivityLogContext.Provider>
    );
};

export const useActivityLog = () => {
    const ctx = useContext(ActivityLogContext);
    if (!ctx) throw new Error('useActivityLog must be used within ActivityLogProvider');
    return ctx;
};
