import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';

// Cet endpoint peut être appelé par un service de cron (ex: Vercel Cron, GitHub Actions)
// ou manuellement via un outil comme Postman/Curl.
// URL: /api/notifications/webhook

export async function POST(request: Request) {
    try {
        // Sécurité : Vérifier le token d'autorisation envoyé par Vercel Cron
        const authHeader = request.headers.get('Authorization');
        if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!db) {
            return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
        }

        // 1. Récupérer les événements de la timeline globale
        const timelineDocRef = doc(db, 'timeline', 'events');
        const timelineSnap = await getDoc(timelineDocRef);
        
        if (!timelineSnap.exists()) {
            return NextResponse.json({ message: 'No timeline events found' }, { status: 200 });
        }

        const { events } = timelineSnap.data();
        if (!events || !Array.isArray(events)) {
            return NextResponse.json({ message: 'Invalid timeline data' }, { status: 200 });
        }

        // 2. Récupérer tous les utilisateurs actifs pour leur envoyer les notifications
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let notificationsCreated = 0;

        // 3. Analyser chaque événement pour chaque utilisateur
        for (const event of events) {
            if (event.validated) continue;

            const deadline = new Date(event.date);
            deadline.setHours(0, 0, 0, 0);

            const diffTime = deadline.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let title = '';
            let message = '';

            if (diffDays === 7) {
                title = 'Rappel Compliance J-7';
                message = `L'échéance "${event.title}" arrive dans une semaine (${event.date}).`;
            } else if (diffDays === 3) {
                title = '⚠️ Alerte Compliance J-3';
                message = `Important : "${event.title}" est dans 3 jours !`;
            } else if (diffDays === 0) {
                title = '🚨 ÉCHÉANCE AUJOURD\'HUI';
                message = `Alerte critique : C'est aujourd'hui la date limite pour "${event.title}".`;
            }

            if (title && message) {
                // Envoyer à tous les utilisateurs (ou filtrer par rôle si nécessaire)
                for (const user of users) {
                    const userNotifsRef = collection(db, 'users', user.id, 'notifications');
                    
                    // Éviter les doublons pour le même événement et le même jour
                    const tag = `${event.id}_${diffDays}_${today.toISOString().split('T')[0]}`;
                    
                    // On pourrait vérifier si une notif avec ce tag existe déjà, 
                    // mais pour simplifier dans ce script, on se base sur le fait que le webhook
                    // est appelé une seule fois par jour.
                    
                    await addDoc(userNotifsRef, {
                        title,
                        message,
                        type: 'deadline',
                        eventId: event.id,
                        diffDays,
                        createdAt: serverTimestamp(),
                        read: false,
                        tag: tag
                    });
                    notificationsCreated++;
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            notificationsCreated,
            message: `${notificationsCreated} notifications générées.` 
        });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Supporte aussi GET pour tester facilement dans le navigateur
export async function GET(request: Request) {
    return POST(request);
}
