// 实时更新Hook - 简化SSE使用

import { useEffect, useState } from 'react';
import { sseClient, SSEEvent } from '@/lib/sse-client';

export function useRealtime<T>(
    eventType: string,
    initialData: T,
    updateFn: (data: T, event: SSEEvent) => T
): T {
    const [data, setData] = useState<T>(initialData);

    useEffect(() => {
        const unsubscribe = sseClient.on(eventType as any, (event) => {
            setData(prev => updateFn(prev, event));
        });

        return () => {
            unsubscribe();
        };
    }, [eventType, updateFn]);

    return data;
}

// 设备状态实时更新Hook
export function useDeviceRealtime(deviceId: string) {
    const [status, setStatus] = useState<{ online: boolean; lastSeen?: string }>({ online: false });

    useEffect(() => {
        const unsubscribeOnline = sseClient.on('device:online', (event) => {
            if (event.data.deviceId === deviceId) {
                setStatus({ online: true, lastSeen: new Date().toISOString() });
            }
        });

        const unsubscribeOffline = sseClient.on('device:offline', (event) => {
            if (event.data.deviceId === deviceId) {
                setStatus({ online: false });
            }
        });

        const unsubscribeUpdate = sseClient.on('device:status:update', (event) => {
            if (event.data.deviceId === deviceId) {
                setStatus(prev => ({ ...prev, ...event.data }));
            }
        });

        return () => {
            unsubscribeOnline();
            unsubscribeOffline();
            unsubscribeUpdate();
        };
    }, [deviceId]);

    return status;
}

