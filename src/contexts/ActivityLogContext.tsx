'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

export type ActivityAction =
    // Sessions & Auth
    | 'LOGIN'
    | 'LOGOUT'
    | 'SESSION_RESTORE'
    // Consultations & Vues
    | 'REPORT_VIEW'
    | 'DOCUMENT_VIEW'
    | 'DOCUMENT_DOWNLOAD'
    | 'MEMO_VIEW'
    | 'PAGE_VIEW'
    // Impressions & Exports
    | 'PRINT_WORKFLOW'
    | 'PRINT_REPORT'
    | 'EXPORT_DATA'
    // Gestion des Risques & Matrice
    | 'RISK_ADD'
    | 'RISK_EDIT'
    | 'RISK_DELETE'
    // Plan de conformité & Tâches
    | 'PLAN_UPDATE'
    | 'TASK_CREATE'
    | 'TASK_UPDATE'
    | 'TASK_DELETE'
    | 'TASK_COMPLETE'
    // Workflows & Processus
    | 'WORKFLOW_CREATE'
    | 'WORKFLOW_UPDATE'
    | 'WORKFLOW_PUBLISH'
    | 'WORKFLOW_DELETE'
    // Documents & Textes
    | 'DOCUMENT_ADD'
    | 'DOCUMENT_EDIT'
    | 'DOCUMENT_DELETE'
    | 'DOCUMENT_STATUS'
    // Mémos & Notes
    | 'MEMO_CREATE'
    | 'MEMO_EDIT'
    | 'MEMO_DELETE'
    | 'MEMO_PIN'
    // Cahier de Recettes & Contrôles
    | 'TEST_EXECUTE'
    | 'ANOMALY_CREATE'
    | 'ANOMALY_UPDATE'
    | 'CONTROL_EXECUTE'
    // Alertes & Paramètres
    | 'ALERT_CREATE'
    | 'ALERT_REMOVE'
    | 'SETTINGS_UPDATE'
    | 'LEGAL_BASE_UPDATE'
    | 'TEAM_UPDATE'
    | 'OTHER';

export interface ActivityEntry {
    id?: string;
    timestamp: string;       // ISO string
    userEmail: string;
    userName: string;
    userRole?: string;
    action: ActivityAction;
    label: string;           // Human-readable description
    detail?: string;         // Extra detail (e.g. document name, page, filters)
    module: string;          // Page/module name
    deviceInfo?: string;
    metadata?: Record<string, any>;
}

interface ActivityLogContextType {
    logs: ActivityEntry[];
    logAction: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void;
    isAdmin: (email: string) => boolean;
}

export const ADMIN_EMAILS = [
    'moslem.gouia@mae.tn',
    'moslem.gouia@gmail.com',
    'conformite@mae.com.tn',
    'admin@mae.tn'
];

const LOCAL_KEY = 'compliance_activity_log';
const MAX_LOCAL_LOGS = 500;

// Helper to get client device / browser info
export const getClientDeviceInfo = (): string => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'Serveur';
    const ua = navigator.userAgent;
    let browser = 'Navigateur inconnu';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Google Chrome';
    else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
    else if (ua.includes('Safari/')) browser = 'Apple Safari';

    let os = 'OS inconnu';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Linux')) os = 'Linux';

    return `${browser} (${os})`;
};

// Standalone function to record an activity log from anywhere
export async function recordActivity(entry: {
    userEmail?: string;
    userName?: string;
    userRole?: string;
    action: ActivityAction;
    label: string;
    detail?: string;
    module: string;
    deviceInfo?: string;
    metadata?: Record<string, any>;
}): Promise<void> {
    try {
        let email = entry.userEmail || '';
        let name = entry.userName || '';
        let role = entry.userRole || '';

        // Try getting user from auth or localStorage if not provided
        if (!email && typeof window !== 'undefined') {
            if (auth?.currentUser?.email) {
                email = auth.currentUser.email;
                name = name || auth.currentUser.displayName || email;
            } else {
                try {
                    const saved = localStorage.getItem('compliance_saved_user');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        email = email || parsed.authEmail || parsed.email || '';
                        name = name || parsed.name || email;
                        role = role || parsed.role || '';
                    }
                } catch (_) {}
            }
        }

        const now = new Date().toISOString();
        const full: ActivityEntry = {
            timestamp: now,
            userEmail: email || 'anonyme@mae.tn',
            userName: name || email || 'Utilisateur',
            userRole: role || 'Utilisateur',
            action: entry.action || 'OTHER',
            label: entry.label || '',
            detail: entry.detail || '',
            module: entry.module || 'Général',
            deviceInfo: entry.deviceInfo || getClientDeviceInfo(),
            metadata: entry.metadata || {}
        };

        if (isFirebaseConfigured && db) {
            await addDoc(collection(db, 'activity_logs'), {
                ...full,
                serverTimestamp: serverTimestamp(),
            });
        } else if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(LOCAL_KEY);
            const list: ActivityEntry[] = saved ? JSON.parse(saved) : [];
            const updated = [full, ...list].slice(0, MAX_LOCAL_LOGS);
            localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
        }
    } catch (e) {
        console.warn('[ActivityLog] Could not record activity:', e);
    }
}

const ActivityLogContext = createContext<ActivityLogContextType | undefined>(undefined);

export const ActivityLogProvider = ({ children }: { children: ReactNode }) => {
    const [logs, setLogs] = useState<ActivityEntry[]>([]);

    const sanitizeEntry = (data: any, id?: string): ActivityEntry => {
        let timestampStr = data?.timestamp;
        if (!timestampStr && data?.serverTimestamp) {
            if (typeof data.serverTimestamp.toDate === 'function') {
                timestampStr = data.serverTimestamp.toDate().toISOString();
            } else if (data.serverTimestamp.seconds) {
                timestampStr = new Date(data.serverTimestamp.seconds * 1000).toISOString();
            }
        }
        return {
            id: id || data?.id,
            timestamp: typeof timestampStr === 'string' ? timestampStr : new Date().toISOString(),
            userEmail: data?.userEmail || '',
            userName: data?.userName || data?.userEmail || 'Utilisateur',
            userRole: data?.userRole || 'Utilisateur',
            action: data?.action || 'OTHER',
            label: data?.label || '',
            detail: data?.detail || '',
            module: data?.module || 'Général',
            deviceInfo: data?.deviceInfo || '',
            metadata: data?.metadata || {},
        };
    };

    // Load from Firestore or localStorage
    useEffect(() => {
        if (isFirebaseConfigured && db) {
            const q = query(
                collection(db, 'activity_logs'),
                orderBy('serverTimestamp', 'desc'),
                limit(1000)
            );
            const unsub = onSnapshot(q, (snap) => {
                const entries: ActivityEntry[] = snap.docs.map(doc => sanitizeEntry(doc.data(), doc.id));
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
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setLogs(parsed.map(item => sanitizeEntry(item)));
                }
            }
        } catch { /* ignore */ }
    };

    const logAction = useCallback((entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => {
        recordActivity(entry);
    }, []);

    const isAdmin = useCallback((email?: string) => {
        if (!email) return false;
        return ADMIN_EMAILS.some(a => a.toLowerCase() === email.toLowerCase());
    }, []);

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
