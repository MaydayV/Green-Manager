'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Download, TrendingUp, DollarSign, Smartphone, MessageSquare, Phone } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { PageHeader } from '@/components/PageHeader';

interface ReportData {
    period: { start: string; end: string; type: string };
    devices: {
        total: number;
        online: number;
        offline: number;
        onlineRate: number;
    };
    sms: {
        sent: number;
        received: number;
        total: number;
    };
    calls: {
        answered: number;
        missed: number;
        total: number;
        avgDuration: number;
        answerRate: number;
    };
    simCards: {
        byOperator: Array<{ operator: string; count: number }>;
    };
    costs: {
        sms: number;
        calls: number;
        data: number;
        total: number;
    };
    performance: {
        avgUptime: number;
    };
    timeSeries?: Array<{ date: string; sms: number; calls: number; devices: number }>;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function ReportsPage() {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState({ type: 'daily', startDate: '', endDate: '' });

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ type: period.type });
            if (period.startDate) params.append('startDate', period.startDate);
            if (period.endDate) params.append('endDate', period.endDate);

            const res = await fetch(`/api/reports?${params}`);
            if (res.ok) {
                setReportData(await res.json());
            }
        } catch (e) {
            console.error('Failed to fetch report:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period.type, period.startDate, period.endDate]);

    const handleExport = (type: string) => {
        const params = new URLSearchParams({ type });
        if (period.startDate) params.append('startDate', period.startDate);
        if (period.endDate) params.append('endDate', period.endDate);
        window.open(`/api/reports/export?${params}`, '_blank');
    };

    if (loading && !reportData) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const operatorData = reportData?.simCards.byOperator.map(op => ({
        name: op.operator || '未知',
        value: op.count
    })) || [];

    return (
        <div className="space-y-6">
            <PageHeader
                title="数据分析与报表"
                description="查看设备运行统计和成本分析"
                actions={
                    <>
                        <Button variant="outline" onClick={() => handleExport('devices')}>
                            <Download className="h-4 w-4 mr-2" /> 导出设备
                        </Button>
                        <Button variant="outline" onClick={() => handleExport('sms')}>
                            <Download className="h-4 w-4 mr-2" /> 导出短信
                        </Button>
                        <Button variant="outline" onClick={() => handleExport('calls')}>
                            <Download className="h-4 w-4 mr-2" /> 导出通话
                        </Button>
                        <Button variant="outline" size="icon" onClick={fetchReport} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </>
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle>筛选条件</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                            <Label>报表类型</Label>
                            <Select value={period.type} onValueChange={(value) => setPeriod({ ...period, type: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">日报</SelectItem>
                                    <SelectItem value="weekly">周报</SelectItem>
                                    <SelectItem value="monthly">月报</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>开始日期</Label>
                            <Input
                                type="date"
                                value={period.startDate}
                                onChange={(e) => setPeriod({ ...period, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>结束日期</Label>
                            <Input
                                type="date"
                                value={period.endDate}
                                onChange={(e) => setPeriod({ ...period, endDate: e.target.value })}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button variant="outline" className="w-full" onClick={() => setPeriod({ type: 'daily', startDate: '', endDate: '' })}>
                                重置
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {reportData && (
                <>
                    {/* 概览卡片 */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="hover-lift">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">设备总数</CardTitle>
                                <Smartphone className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{reportData.devices.total}</div>
                                <p className="text-xs text-muted-foreground">
                                    在线率: {reportData.devices.onlineRate.toFixed(1)}%
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="hover-lift">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">短信统计</CardTitle>
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{reportData.sms.total}</div>
                                <p className="text-xs text-muted-foreground">
                                    发送: {reportData.sms.sent} | 接收: {reportData.sms.received}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="hover-lift">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">通话统计</CardTitle>
                                <Phone className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{reportData.calls.total}</div>
                                <p className="text-xs text-muted-foreground">
                                    接通率: {reportData.calls.answerRate.toFixed(1)}%
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="hover-lift">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">成本估算</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">¥{reportData.costs.total.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground">
                                    短信: ¥{reportData.costs.sms.toFixed(2)} | 通话: ¥{reportData.costs.calls.toFixed(2)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 时间趋势图 */}
                    {reportData.timeSeries && reportData.timeSeries.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>数据趋势</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={reportData.timeSeries}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="date" 
                                            tickFormatter={(value) => new Date(value).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                                        />
                                        <YAxis />
                                        <Tooltip 
                                            labelFormatter={(value) => new Date(value).toLocaleDateString('zh-CN')}
                                        />
                                        <Legend />
                                        <Area 
                                            type="monotone" 
                                            dataKey="sms" 
                                            stackId="1" 
                                            stroke="#3b82f6" 
                                            fill="#3b82f6" 
                                            fillOpacity={0.6}
                                            name="短信"
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="calls" 
                                            stackId="1" 
                                            stroke="#8b5cf6" 
                                            fill="#8b5cf6" 
                                            fillOpacity={0.6}
                                            name="通话"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* 运营商分布 */}
                    {operatorData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>SIM卡运营商分布</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={operatorData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {operatorData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* 短信和通话对比 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>短信与通话对比</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={[
                                    { name: '短信', 发送: reportData.sms.sent, 接收: reportData.sms.received },
                                    { name: '通话', 接通: reportData.calls.answered, 未接: reportData.calls.missed }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="发送" fill="#3b82f6" />
                                    <Bar dataKey="接收" fill="#10b981" />
                                    <Bar dataKey="接通" fill="#8b5cf6" />
                                    <Bar dataKey="未接" fill="#ef4444" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 设备状态 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>设备状态统计</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">在线设备</p>
                                    <div className="text-3xl font-bold text-green-500">{reportData.devices.online}</div>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">离线设备</p>
                                    <div className="text-3xl font-bold text-gray-500">{reportData.devices.offline}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 性能指标 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>性能指标</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">平均运行时长</p>
                                    <div className="text-2xl font-bold">{Math.round(reportData.performance.avgUptime / 3600)} 小时</div>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">平均通话时长</p>
                                    <div className="text-2xl font-bold">{Math.round(reportData.calls.avgDuration)} 秒</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
