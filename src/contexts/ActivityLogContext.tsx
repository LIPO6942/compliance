import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
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

const ADMIN_EMAILS = ['moslem.gouia@mae.tn', 'moslem.gouia@gmail.com'];
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
        const userEmailToUse = auth?.currentUser?.email || entry.userEmail;
        const full: ActivityEntry = { ...entry, userEmail: userEmailToUse, timestamp: now };

        if (isFirebaseConfigured && db) {
            addDoc(collection(db, 'activity_logs'), {
                ...full,
                serverTimestamp: serverTimestamp(),
            }).then(() => {
                console.log("[ActivityLog] Successfully logged action:", full.action);
            }).catch((err: any) => {
                console.error("[ActivityLog] Failed to log action to Firestore:", err);
                toast({ variant: "destructive", title: "Erreur Historisation", description: err.message || "Impossible de sauvegarder l'action." });
            });
        } else {
            // Persist to localStorage (cap at MAX_LOCAL_LOGS)
            setLogs(prev => {
                const updated = [full, ...prev].slice(0, MAX_LOCAL_LOGS);
                try { localStorage.setItem(LOCAL_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
                return updated;
            });
        }
    }, []);

    const isAdmin = useCallback((email: string) => ADMIN_EMAILS.includes(email), []);

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
