'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone } from 'lucide-react';
import { listenToPendingDeviceRequests, fetchPendingDeviceRequests, DeviceAuthRequest } from '@/lib/deviceApprovalService';

export const DeviceApprovalHeaderTrigger = () => {
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        fetchPendingDeviceRequests().then(reqs => setPendingCount(reqs.length));

        const unsub = listenToPendingDeviceRequests((reqs) => {
            setPendingCount(reqs.length);
        });

        return () => unsub();
    }, []);

    if (pendingCount === 0) return null;

    return (
        <Button
            variant="outline"
            size="sm"
            className="relative bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 rounded-xl font-bold text-xs flex items-center gap-1.5 animate-pulse shadow-sm"
            onClick={() => {
                // Re-trigger modal open if needed
                window.dispatchEvent(new CustomEvent('open-device-approval-modal'));
            }}
        >
            <Smartphone className="h-4 w-4 text-amber-600" />
            <span className="hidden sm:inline">1 Appareil en attente</span>
            <span className="bg-amber-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingCount}
            </span>
        </Button>
    );
};
