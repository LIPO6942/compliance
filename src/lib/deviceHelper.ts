/**
 * Utility to identify the current device/browser.
 * Stores a persistent UUID in localStorage to recognize "trusted" devices.
 */

const DEVICE_ID_KEY = 'compliance_device_id';

export const getDeviceId = (): string => {
    if (typeof window === 'undefined') return 'server';

    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
};

export const getDeviceInfo = () => {
    if (typeof window === 'undefined') return { name: 'Server', agent: 'None' };

    return {
        name: navigator.platform || 'Unknown Device',
        agent: navigator.userAgent,
        lastUsed: new Date().toISOString(),
    };
};
