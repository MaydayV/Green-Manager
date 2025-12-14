'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Download, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/PageHeader';

interface AuditLog {
    id: string;
    userId?: string;
    action: string;
    target?: string;
    details?: string;
    timestamp: string;
}

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filter, setFilter] = useState({ action: '__all__', startDate: '', endDate: '' });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '50'
            });
            if (filter.action && filter.action !== '__all__') params.append('action', filter.action);
            if (filter.startDate) params.append('startDate', filter.startDate);
            if (filter.endDate) params.append('endDate', filter.endDate);

            const res = await fetch(`/api/audit?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setTotalPages(data.pagination?.totalPages || 1);
            }
        } catch (e) {
            console.error('Failed to fetch audit logs:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filter]);

    const handleExport = () => {
        const params = new URLSearchParams({ type: 'audit' });
        if (filter.startDate) params.append('startDate', filter.startDate);
        if (filter.endDate) params.append('endDate', filter.endDate);
        window.open(`/api/reports/export?${params}`, '_blank');
    };

    const formatAction = (action: string) => {
        const actionMap: Record<string, string> = {
            'device_command': '设备命令',
            'sms_send': '发送短信',
            'device_create': '创建设备',
            'device_update': '更新设备',
            'device_delete': '删除设备',
            'group_create': '创建分组',
            'group_update': '更新分组',
            'group_delete': '删除分组'
        };
        return actionMap[action] || action;
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="操作审计日志"
                description="查看所有系统操作记录"
                actions={
                    <>
                        <Button variant="outline" onClick={handleExport}>
                            <Download className="h-4 w-4 mr-2" /> 导出CSV
                        </Button>
                        <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </>
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Filter className="h-5 w-5" />
                        <span>筛选条件</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">操作类型</label>
                            <Select value={filter.action} onValueChange={(value) => setFilter({ ...filter, action: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="全部" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">全部</SelectItem>
                                    <SelectItem value="device_command">设备命令</SelectItem>
                                    <SelectItem value="sms_send">发送短信</SelectItem>
                                    <SelectItem value="device_create">创建设备</SelectItem>
                                    <SelectItem value="device_update">更新设备</SelectItem>
                                    <SelectItem value="group_create">创建分组</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">开始日期</label>
                            <Input
                                type="date"
                                value={filter.startDate}
                                onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">结束日期</label>
                            <Input
                                type="date"
                                value={filter.endDate}
                                onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setFilter({ action: '', startDate: '', endDate: '' })}
                            >
                                清除筛选
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium">时间</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">目标</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">用户</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">详情</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center">
                                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                            暂无日志记录
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map(log => (
                                        <tr key={log.id} className="border-b hover:bg-muted/30">
                                            <td className="px-4 py-3 text-sm">
                                                {new Date(log.timestamp).toLocaleString('zh-CN')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline">{formatAction(log.action)}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {log.target || '--'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {log.userId || '系统'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {log.details ? (
                                                    <details className="cursor-pointer">
                                                        <summary className="text-primary hover:underline">查看详情</summary>
                                                        <pre className="mt-2 text-xs bg-muted p-2 rounded">
                                                            {JSON.stringify(JSON.parse(log.details), null, 2)}
                                                        </pre>
                                                    </details>
                                                ) : '--'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                上一页
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                第 {page} / {totalPages} 页
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                下一页
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
