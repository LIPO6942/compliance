/**
 * Device Authorization & Trusted Device Pairing Service
 * Enables multi-device verification where a new device (e.g. mobile phone)
 * requests authorization from an already logged-in / verified device.
 */

import { db, isFirebaseConfigured } from '@/lib/firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    onSnapshot,
    query,
    where,
    deleteDoc
} from 'firebase/firestore';

export interface DeviceAuthRequest {
    id: string;
    targetEmail: string;
    targetName: string;
    deviceId: string;
    deviceName: string;
    deviceAgent: string;
    pinCode: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    approvedBy?: string;
    approvedAt?: string;
}

export interface TrustedDeviceRecord {
    deviceId: string;
    deviceName: string;
    trusted: boolean;
    registeredAt: string;
    lastSeen: string;
    isMaster?: boolean;
}

const LOCAL_TRUSTED_PREFIX = 'compliance_trusted_device_';
const DEVICE_LINKED_PROFILE_KEY = 'compliance_device_linked_profile';

const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
};

/**
 * Checks local storage to see if device is cached as trusted
 */
export const isDeviceTrustedLocally = (email: string, deviceId: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
        const key = `${LOCAL_TRUSTED_PREFIX}${normalizeEmail(email)}_${deviceId}`;
        return window.localStorage?.getItem(key) === 'true';
    } catch {
        return false;
    }
};

/**
 * Marks device as trusted in local storage
 */
export const markDeviceTrustedLocally = (email: string, deviceId: string): void => {
    if (typeof window === 'undefined') return;
    try {
        const key = `${LOCAL_TRUSTED_PREFIX}${normalizeEmail(email)}_${deviceId}`;
        window.localStorage?.setItem(key, 'true');
    } catch { /* ignore */ }
};

/**
 * Saves the chosen profile for this specific device so on next visit the user
 * is auto-logged in without seeing the login page at all.
 */
export const setDeviceLinkedProfile = (profile: { email: string; name: string; role: string }): void => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage?.setItem(DEVICE_LINKED_PROFILE_KEY, JSON.stringify(profile));
    } catch { /* ignore */ }
};

/**
 * Returns the profile saved for this device, or null if no profile has been linked.
 */
export const getDeviceLinkedProfile = (): { email: string; name: string; role: string } | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage?.getItem(DEVICE_LINKED_PROFILE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

/**
 * Clears the device linked profile (e.g. on logout).
 */
export const clearDeviceLinkedProfile = (): void => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage?.removeItem(DEVICE_LINKED_PROFILE_KEY);
    } catch { /* ignore */ }
};

/**
 * Check if the device is registered as trusted in Firestore or locally.
 * If this is the first device ever for this account, auto-approves it as the Master device.
 */
export const checkIsDeviceApproved = async (
    email: string,
    deviceId: string,
    deviceInfo: { name: string; agent: string }
): Promise<boolean> => {
    const normEmail = normalizeEmail(email);

    // 1. Check local storage cache first
    if (isDeviceTrustedLocally(email, deviceId)) {
        return true;
    }

    if (!isFirebaseConfigured || !db) {
        // In local/offline mode, auto-trust
        markDeviceTrustedLocally(email, deviceId);
        return true;
    }

    try {
        const emailDocRef = doc(db, 'trusted_devices', normEmail);
        const deviceDocRef = doc(db, 'trusted_devices', normEmail, 'devices', deviceId);

        const deviceSnap = await getDoc(deviceDocRef);
        if (deviceSnap.exists() && deviceSnap.data()?.trusted === true) {
            markDeviceTrustedLocally(email, deviceId);
            return true;
        }

        // Check if there are any devices registered at all for this account
        const allDevicesSnap = await getDocs(collection(db, 'trusted_devices', normEmail, 'devices'));

        if (allDevicesSnap.empty) {
            // First device ever seen for this account (Master Device, e.g. Desktop PC)
            const masterRecord: TrustedDeviceRecord = {
                deviceId,
                deviceName: deviceInfo.name,
                trusted: true,
                registeredAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                isMaster: true
            };
            await setDoc(deviceDocRef, masterRecord, { merge: true });
            await setDoc(emailDocRef, { email, updatedAt: new Date().toISOString() }, { merge: true });
            markDeviceTrustedLocally(email, deviceId);
            return true;
        }

        return false;
    } catch (err) {
        console.warn("Error checking trusted device status:", err);
        // Fallback to local check
        return isDeviceTrustedLocally(email, deviceId);
    }
};

/**
 * Create a new device authorization request from an untrusted device
 */
export const requestDeviceApproval = async (
    email: string,
    name: string,
    deviceId: string,
    deviceInfo: { name: string; agent: string }
): Promise<{ requestId: string; pinCode: string }> => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    // Generate a 6-digit verification PIN
    const pinCode = Math.floor(100000 + Math.random() * 900000).toString();

    const requestData: DeviceAuthRequest = {
        id: requestId,
        targetEmail: email.trim().toLowerCase(),
        targetName: name,
        deviceId,
        deviceName: deviceInfo.name,
        deviceAgent: deviceInfo.agent,
        pinCode,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    if (isFirebaseConfigured && db) {
        try {
            const reqDocRef = doc(db, 'device_authorizations', requestId);
            await setDoc(reqDocRef, requestData);
        } catch (err) {
            console.error("Failed to persist device authorization request to Firestore:", err);
        }
    }

    return { requestId, pinCode };
};

/**
 * Listen in real time to the authorization status on the waiting device (mobile phone)
 */
export const listenToApprovalStatus = (
    requestId: string,
    email: string,
    deviceId: string,
    onApproved: () => void,
    onRejected: () => void
): (() => void) => {
    if (!isFirebaseConfigured || !db) {
        return () => {};
    }

    const reqDocRef = doc(db, 'device_authorizations', requestId);
    const unsubscribe = onSnapshot(reqDocRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as DeviceAuthRequest;
        if (data.status === 'approved') {
            markDeviceTrustedLocally(email, deviceId);
            onApproved();
        } else if (data.status === 'rejected') {
            onRejected();
        }
    }, (err) => {
        console.warn("Approval listener error:", err);
    });

    return unsubscribe;
};

/**
 * Approve a device request from the already connected device
 */
export const approveDeviceRequest = async (
    request: DeviceAuthRequest,
    approvedByEmail: string
): Promise<void> => {
    if (!isFirebaseConfigured || !db) {
        markDeviceTrustedLocally(request.targetEmail, request.deviceId);
        return;
    }

    try {
        const normEmail = normalizeEmail(request.targetEmail);

        // 1. Add device to trusted_devices collection FIRST
        const deviceDocRef = doc(db, 'trusted_devices', normEmail, 'devices', request.deviceId);
        const deviceRecord: TrustedDeviceRecord = {
            deviceId: request.deviceId,
            deviceName: request.deviceName,
            trusted: true,
            registeredAt: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        };
        await setDoc(deviceDocRef, deviceRecord, { merge: true });

        // 2. Delete the request document entirely — this causes the real-time listener
        //    on ALL connected devices to immediately remove it from the pending list,
        //    making the popup disappear on every device simultaneously.
        const reqDocRef = doc(db, 'device_authorizations', request.id);
        await deleteDoc(reqDocRef);

    } catch (err) {
        console.error("Error approving device request:", err);
        throw err;
    }
};

/**
 * Reject a device request
 */
export const rejectDeviceRequest = async (requestId: string): Promise<void> => {
    if (!isFirebaseConfigured || !db) return;

    try {
        const reqDocRef = doc(db, 'device_authorizations', requestId);
        await updateDoc(reqDocRef, {
            status: 'rejected'
        });
    } catch (err) {
        console.error("Error rejecting device request:", err);
    }
};

/**
 * Validate a request using PIN code directly
 */
export const validatePinDirectly = async (
    requestId: string,
    email: string,
    deviceId: string,
    enteredPin: string
): Promise<boolean> => {
    // Master bypass PIN for administrator/emergency testing: "123456" or "000000"
    if (enteredPin.trim() === '123456' || enteredPin.trim() === '000000') {
        markDeviceTrustedLocally(email, deviceId);
        if (isFirebaseConfigured && db) {
            try {
                const normEmail = normalizeEmail(email);
                const deviceDocRef = doc(db, 'trusted_devices', normEmail, 'devices', deviceId);
                await setDoc(deviceDocRef, {
                    deviceId,
                    trusted: true,
                    registeredAt: new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                    method: 'master_pin'
                }, { merge: true });
            } catch { /* ignore */ }
        }
        return true;
    }

    if (!isFirebaseConfigured || !db) {
        markDeviceTrustedLocally(email, deviceId);
        return true;
    }

    try {
        const reqDocRef = doc(db, 'device_authorizations', requestId);
        const snap = await getDoc(reqDocRef);
        if (snap.exists()) {
            const data = snap.data() as DeviceAuthRequest;
            if (data.pinCode === enteredPin.trim()) {
                await approveDeviceRequest(data, email);
                markDeviceTrustedLocally(email, deviceId);
                return true;
            }
        }
    } catch (err) {
        console.error("Error validating PIN code:", err);
    }

    return false;
};

/**
 * Listen for all pending device authorization requests in real-time (Desktop listener)
 * Any connected device in the workspace can view and approve incoming device requests.
 */
export const listenToPendingDeviceRequests = (
    onRequestsChange: (requests: DeviceAuthRequest[]) => void
): (() => void) => {
    if (!isFirebaseConfigured || !db) {
        return () => {};
    }

    try {
        const q = query(
            collection(db, 'device_authorizations'),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqs: DeviceAuthRequest[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as DeviceAuthRequest));

            console.log(`[DeviceApproval] ${reqs.length} pending authorization request(s) received`);
            onRequestsChange(reqs);
        }, (err) => {
            console.warn("Pending device requests listener error:", err);
        });

        return unsubscribe;
    } catch (err) {
        console.warn("Failed to attach device request listener:", err);
        return () => {};
    }
};

/**
 * Direct fetch of all pending device requests
 */
export const fetchPendingDeviceRequests = async (): Promise<DeviceAuthRequest[]> => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        const q = query(
            collection(db, 'device_authorizations'),
            where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DeviceAuthRequest));
    } catch (err) {
        console.warn("Error fetching pending requests:", err);
        return [];
    }
};

