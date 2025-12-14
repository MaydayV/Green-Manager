'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PhoneDialer } from '@/components/PhoneDialer';
import { PageHeader } from '@/components/PageHeader';

interface CallRecord {
    id: string;
    deviceId: string;
    slotNum: number;
    direction: string;
    phone: string;
    startTime: string;
    duration: number;
    status: string;
    device?: { name: string };
}

export default function CallsPage() {
    const [calls, setCalls] = useState<CallRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCalls = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/calls');
            if (res.ok) {
                setCalls(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCalls();
    }, []);

    const formatDuration = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const getCallIcon = (call: CallRecord) => {
        if (call.status === 'missed') return <PhoneMissed className="h-4 w-4 text-red-500" />;
        if (call.direction === 'outgoing') return <PhoneOutgoing className="h-4 w-4 text-blue-500" />;
        return <PhoneIncoming className="h-4 w-4 text-green-500" />;
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="通话记录"
                actions={
                    <>
                        <PhoneDialer />
                        <Button variant="outline" size="icon" onClick={fetchCalls} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </>
                }
            />

            <div className="rounded-lg border border-border/50 bg-card">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">类型</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">设备 / 卡槽</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">号码</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">时间</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">时长</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">状态</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {calls.map((call) => (
                                <tr key={call.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle">{getCallIcon(call)}</td>
                                    <td className="p-4 align-middle font-medium">{call.device?.name || call.deviceId} (卡槽 {call.slotNum})</td>
                                    <td className="p-4 align-middle">{call.phone}</td>
                                    <td className="p-4 align-middle">{new Date(call.startTime).toLocaleString()}</td>
                                    <td className="p-4 align-middle">{formatDuration(call.duration)}</td>
                                    <td className="p-4 align-middle">
                                        <Badge variant={call.status === 'completed' ? 'default' : 'secondary'}>
                                            {call.status}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                            {calls.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="p-4 text-center text-muted-foreground">暂无通话记录。</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
