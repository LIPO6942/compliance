import { NextResponse } from 'next/server';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

/**
 * One-time cleanup route: deletes all pending device_authorizations from Firestore.
 * Call via GET /api/cleanup-device-requests
 * Can be removed after first use.
 */
export async function GET() {
    if (!isFirebaseConfigured || !db) {
        return NextResponse.json({ ok: true, deleted: 0, message: 'Firebase not configured — nothing to clean.' });
    }

    try {
        const q = query(collection(db, 'device_authorizations'));
        const snap = await getDocs(q);
        const deletions = snap.docs.map(d => deleteDoc(doc(db!, 'device_authorizations', d.id)));
        await Promise.all(deletions);
        return NextResponse.json({ ok: true, deleted: snap.docs.length, message: `Cleaned ${snap.docs.length} device authorization requests.` });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
    }
}
