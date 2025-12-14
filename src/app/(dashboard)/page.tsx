'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, MessageSquare, PhoneCall, Radio } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { sseClient } from '@/lib/sse-client';
import { cachedFetch, cacheKeys, dataCache } from '@/lib/cache';
import { PageHeader } from '@/components/PageHeader';

interface DashboardStats {
  devices: { total: number; online: number };
  today: { smsSent: number; smsReceived: number; calls: number };
  history: { date: string; smsSent: number; smsReceived: number; calls: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const data = await cachedFetch<DashboardStats>(
        '/api/stats',
        undefined,
        'dashboard:stats',
        30 * 1000 // 30秒缓存
      );
      setStats(data);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // 订阅SSE实时更新
    const unsubscribeDevice = sseClient.on('device:status:update', (event) => {
      // 设备状态更新，刷新统计数据
      dataCache.delete('dashboard:stats');
      fetchStats();
    });

    const unsubscribeSms = sseClient.on('sms:received', () => {
      // 新短信到达，刷新统计数据
      dataCache.delete('dashboard:stats');
      fetchStats();
    });

    return () => {
      unsubscribeDevice();
      unsubscribeSms();
    };
  }, [fetchStats]);

  if (loading) return <div className="p-8">正在加载仪表盘...</div>;
  if (!stats) return <div className="p-8">加载数据失败。</div>;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="仪表盘"
        description="欢迎回来，这是您的系统概览"
      />

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-lift overflow-hidden relative card-glow border-l-4 border-l-blue-500/60">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-full -mr-16 -mt-16 blur-xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">设备总数</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{stats.devices.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500 font-medium">{stats.devices.online}</span> 在线
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift overflow-hidden relative card-glow border-l-4 border-l-green-500/60">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-full -mr-16 -mt-16 blur-xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">今日短信发送</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{stats.today.smsSent}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-blue-500 font-medium">+{stats.today.smsReceived}</span> 接收
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift overflow-hidden relative card-glow border-l-4 border-l-purple-500/60">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-full -mr-16 -mt-16 blur-xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">今日通话</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <PhoneCall className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{stats.today.calls}</div>
            <p className="text-xs text-muted-foreground mt-1">
              总通话量
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift overflow-hidden relative card-glow border-l-4 border-l-emerald-500/60">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-full -mr-16 -mt-16 blur-xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">系统状态</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <Radio className="h-5 w-5 text-white pulse-glow" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-emerald-500">正常</div>
            <p className="text-xs text-muted-foreground mt-1">
              所有系统运行正常
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

        {/* SMS Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>短信流量 (最近7天)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => val.slice(5)} // Show MM-DD
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border-soft)' }}
                  />
                  <Legend />
                  <Bar dataKey="smsSent" name="发送" fill="#adfa1d" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="smsReceived" name="接收" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Call Chart */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>通话活动 (最近7天)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => val.slice(5)}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border-soft)' }}
                  />
                  <Line type="monotone" dataKey="calls" name="通话" stroke="#8884d8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
