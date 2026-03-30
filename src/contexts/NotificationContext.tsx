import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTimeline, TimelineEvent } from './TimelineContext';
import { useToast } from '@/hooks/use-toast';
import { useUser } from './UserContext';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, setDoc, Timestamp } from 'firebase/firestore';

interface NotificationContextType {
    permission: NotificationPermission;
    requestPermission: () => Promise<void>;
    sendNotification: (title: string, options?: NotificationOptions) => void;
    isSupported: boolean;
    checkUpcomingDeadlines: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);
    const { events } = useTimeline();
    const { user } = useUser();
    const { toast } = useToast();

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setIsSupported(true);
            setPermission(Notification.permission);
        }
    }, []);

    // Écouter les notifications Firestore pour l'utilisateur
    useEffect(() => {
        if (!isFirebaseConfigured || !db || !user?.uid || permission !== 'granted') return;

        console.log("🔔 NotificationContext: Démarrage de l'écoute Firestore pour", user.uid);
        
        const notificationsRef = collection(db, 'users', user.uid, 'notifications');
        // On ne prend que les notifications récentes (non lues ou du jour)
        const q = query(
            notificationsRef, 
            where('read', '==', false),
            orderBy('createdAt', 'desc'),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    console.log("🔔 Nouvelle notification Firestore reçue:", data);
                    
                    sendNotification(data.title || 'Alerte Compliance', {
                        body: data.message,
                        data: { id: change.doc.id }
                    });

                    // Marquer comme lu immédiatement pour ne pas la réafficher au rechargement
                    const docRef = doc(db!, 'users', user!.uid!, 'notifications', change.doc.id);
                    setDoc(docRef, { read: true }, { merge: true });
                }
            });
        });

        return () => unsubscribe();
    }, [user?.uid, permission]);

    const requestPermission = async () => {
        if (!isSupported) return;
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
            toast({
                title: "Notifications activées",
                description: "Vous recevrez désormais des alertes système pour vos échéances.",
            });
        }
    };

    const sendNotification = (title: string, options?: NotificationOptions) => {
        if (!isSupported || permission !== 'granted') return;
        
        try {
            const n = new Notification(title, {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                ...options
            });
            
            n.onclick = () => {
                window.focus();
                n.close();
            };
        } catch (e) {
            console.error('Failed to send notification:', e);
        }
    };

    const checkUpcomingDeadlines = () => {
        // ... (Logique locale conservée en complément, ou migrée vers le Webhook)
        if (!events || events.length === 0 || permission !== 'granted') return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        events.forEach((event: TimelineEvent) => {
            if (event.validated) return;

            const deadline = new Date(event.date);
            deadline.setHours(0, 0, 0, 0);

            const diffTime = deadline.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const storageKey = `notif_sent_${event.id}_${diffDays}`;
            const alreadySent = localStorage.getItem(storageKey);

            if (alreadySent) return;

            let message = '';
            let title = 'Rappel d\'échéance';

            if (diffDays === 7) {
                message = `L'échéance "${event.title}" arrive dans 7 jours (${event.category})`;
            } else if (diffDays === 3) {
                message = `Attention : "${event.title}" arrive dans 3 jours !`;
            } else if (diffDays === 0) {
                title = '🚨 Échéance aujourd\'hui !';
                message = `C'est le jour J pour : ${event.title}`;
            }

            if (message) {
                sendNotification(title, {
                    body: message,
                    tag: `${event.id}_${diffDays}`,
                });
                localStorage.setItem(storageKey, new Date().toISOString());
            }
        });
    };

    // Vérifier les échéances au chargement
    useEffect(() => {
        if (permission === 'granted' && events.length > 0) {
            checkUpcomingDeadlines();
        }
    }, [events, permission]);

    return (
        <NotificationContext.Provider value={{ permission, requestPermission, sendNotification, isSupported, checkUpcomingDeadlines }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
