'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';

interface Alert {
    id: string;
    deviceId: string;
    type: string;
    message: string;
    level: string;
    timestamp: string;
    isResolved: boolean;
    device?: { name: string };
}

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/alerts');
            if (res.ok) {
                setAlerts(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleResolve = async (id: string) => {
        try {
            const res = await fetch(`/api/alerts/${id}`, { method: 'PUT' });
            if (res.ok) fetchAlerts();
        } catch (e) { alert('Error resolving'); }
    };

    const getIcon = (level: string) => {
        if (level === 'critical') return <AlertCircle className="h-5 w-5 text-red-500" />;
        if (level === 'warning') return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="告警中心"
                actions={
                    <Button variant="outline" size="icon" onClick={fetchAlerts} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                }
            />

            <div className="space-y-4">
                {alerts.map((alert) => (
                    <Card key={alert.id} className={alert.isResolved ? 'opacity-60' : ''}>
                        <CardHeader className="flex flex-row items-center justify-between py-2">
                            <div className="flex items-center space-x-2">
                                {getIcon(alert.level)}
                                <CardTitle className="text-base font-medium">
                                    {alert.message}
                                </CardTitle>
                            </div>
                            <Badge variant={alert.isResolved ? 'secondary' : 'destructive'}>
                                {alert.isResolved ? '已解决' : '待处理'}
                            </Badge>
                        </CardHeader>
                        <CardContent className="py-2 flex justify-between items-center">
                            <div className="text-sm text-muted-foreground">
                                设备: {alert.device?.name || alert.deviceId} | 时间: {new Date(alert.timestamp).toLocaleString()}
                            </div>
                            {!alert.isResolved && (
                                <Button size="sm" variant="outline" onClick={() => handleResolve(alert.id)}>
                                    标记为已解决
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
                {alerts.length === 0 && !loading && (
                    <div className="text-center py-10 text-muted-foreground">暂无告警。</div>
                )}
            </div>
        </div>
    );
}
