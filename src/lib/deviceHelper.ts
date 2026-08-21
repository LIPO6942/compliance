/**
 * Utility to identify the current device/browser.
 * Stores a persistent UUID in localStorage to recognize "trusted" devices.
 * Fully safe for mobile browsers, private mode, and HTTP contexts.
 */

const DEVICE_ID_KEY = 'compliance_device_id';

// In-memory fallback if localStorage is blocked (e.g. strict private mode or webviews)
let memoryDeviceId: string | null = null;

/**
 * Universally safe UUID generator.
 * Falls back across crypto.randomUUID -> crypto.getRandomValues -> Math.random.
 */
export const generateUUID = (): string => {
    try {
        if (typeof crypto !== 'undefined') {
            if (typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
            if (typeof crypto.getRandomValues === 'function') {
                const buffer = new Uint8Array(16);
                crypto.getRandomValues(buffer);
                buffer[6] = (buffer[6] & 0x0f) | 0x40; // Version 4
                buffer[8] = (buffer[8] & 0x3f) | 0x80; // Variant 10
                return [...buffer].map((b, i) =>
                    (i === 4 || i === 6 || i === 8 || i === 10 ? '-' : '') +
                    b.toString(16).padStart(2, '0')
                ).join('');
            }
        }
    } catch {
        // Fall through to Math.random fallback
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export const getDeviceId = (): string => {
    if (typeof window === 'undefined') return 'server';

    try {
        let deviceId = window.localStorage?.getItem(DEVICE_ID_KEY);
        if (!deviceId) {
            deviceId = generateUUID();
            try {
                window.localStorage?.setItem(DEVICE_ID_KEY, deviceId);
            } catch {
                // Ignore storage quota/permission errors
            }
        }
        return deviceId;
    } catch {
        if (!memoryDeviceId) {
            memoryDeviceId = generateUUID();
        }
        return memoryDeviceId;
    }
};

export const getDeviceInfo = () => {
    if (typeof window === 'undefined') return { name: 'Server', agent: 'None', lastUsed: new Date().toISOString() };

    try {
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
        const platform = typeof navigator !== 'undefined' ? (navigator as any).userAgentData?.platform || navigator.platform || 'Unknown' : 'Unknown';

        // Detect mobile friendly name
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const deviceName = isMobile ? `Mobile (${platform})` : `Desktop (${platform})`;

        return {
            name: deviceName,
            agent: userAgent.slice(0, 200),
            lastUsed: new Date().toISOString(),
        };
    } catch {
        return {
            name: 'Web Device',
            agent: 'Browser',
            lastUsed: new Date().toISOString(),
        };
    }
};

