'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    RefreshCw, 
    Power, 
    Download, 
    Radio, 
    Wifi, 
    Signal, 
    MessageSquare, 
    Phone, 
    Settings,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SendSmsDialog } from '@/components/SendSmsDialog';

interface Device {
    id: string;
    name?: string;
    ip?: string;
    status: string;
    token?: string;
    autoAnswer: boolean;
    ttsContent: string;
    lastSeen?: string;
    slots: Slot[];
    statuses: DeviceStatus[];
    messages: SmsMessage[];
    calls: CallRecord[];
    alerts: Alert[];
}

interface Slot {
    id: string;
    slotNum: number;
    operator?: string;
    simStatus?: string;
    phoneNumber?: string;
    signalStrength?: number;
    imsi?: string;
    iccid?: string;
}

interface DeviceStatus {
    id: number;
    wifiSsid?: string;
    wifiStrength?: number;
    temp?: number;
    uptime?: number;
    timestamp: string;
}

interface SmsMessage {
    id: string;
    direction: string;
    phone: string;
    content: string;
    timestamp: string;
    status: string;
}

interface CallRecord {
    id: string;
    direction: string;
    phone: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    connected: boolean;
}

interface Alert {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    isResolved: boolean;
}

export default function DeviceDetailPage({
    params: _params,
    searchParams: _searchParams,
}: {
    params?: Promise<{ id: string }>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
} = {}) {
    const params = useParams();
    const router = useRouter();
    const deviceId = params.id as string;
    
    const [device, setDevice] = useState<Device | null>(null);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState<string | null>(null);

    useEffect(() => {
        fetchDevice();
    }, [deviceId]);

    const fetchDevice = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/devices/${deviceId}`);
            if (res.ok) {
                const data = await res.json();
                setDevice(data);
            } else {
                alert('设备不存在');
                router.push('/devices');
            }
        } catch (e) {
            console.error(e);
            alert('加载设备信息失败');
        } finally {
            setLoading(false);
        }
    };

    const executeCommand = async (command: string, params: Record<string, any> = {}) => {
        if (!device) return;
        
        setExecuting(command);
        try {
            const res = await fetch(`/api/devices/${deviceId}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command, ...params })
            });

            const result = await res.json();
            if (result.success) {
                alert('命令执行成功');
                setTimeout(() => fetchDevice(), 1000); // Refresh after 1s
            } else {
                alert(`命令执行失败: ${result.error || '未知错误'}`);
            }
        } catch (e) {
            alert('命令执行失败，请重试');
            console.error(e);
        } finally {
            setExecuting(null);
        }
    };

    const getOperatorName = (op?: string) => {
        const map: Record<string, string> = {
            'C': '中国移动',
            'U': '中国联通',
            'T': '中国电信',
            'N': '识别失败',
            'X': '境外卡'
        };
        return map[op || ''] || '未知';
    };

    const getSimStatusBadge = (status?: string) => {
        if (!status) return <Badge variant="outline">未知</Badge>;
        if (status === 'OK') return <Badge className="bg-green-500">正常</Badge>;
        if (status === 'ERR') return <Badge variant="destructive">异常</Badge>;
        if (status === 'NOSIM') return <Badge variant="outline">无卡</Badge>;
        if (status === 'PUK') return <Badge variant="destructive">PUK锁定</Badge>;
        if (status === 'NS') return <Badge variant="destructive">无服务</Badge>;
        return <Badge variant="outline">{status}</Badge>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!device) {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">设备不存在</p>
            </div>
        );
    }

    const latestStatus = device.statuses?.[0];
    const signalStrength = latestStatus?.wifiStrength || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/devices')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">
                            {device.name || `设备 ${device.id.substring(0, 8)}`}
                        </h2>
                        <p className="text-muted-foreground font-mono text-sm mt-1">{device.id}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={fetchDevice} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <SendSmsDialog trigger={<Button>发送短信</Button>} />
                </div>
            </div>

            {/* Device Info Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover-lift">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">设备状态</CardTitle>
                        <div className={`h-2 w-2 rounded-full ${device.status === 'online' ? 'bg-green-500 pulse-glow' : 'bg-gray-300'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{device.status === 'online' ? '在线' : '离线'}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {device.lastSeen ? `最后在线: ${new Date(device.lastSeen).toLocaleString('zh-CN')}` : '从未在线'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover-lift">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">WiFi信号</CardTitle>
                        <Wifi className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{signalStrength}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {latestStatus?.wifiSsid || '未连接'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover-lift">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">IP地址</CardTitle>
                        <Radio className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">{device.ip || '--'}</div>
                        <p className="text-xs text-muted-foreground mt-1">设备网络地址</p>
                    </CardContent>
                </Card>

                <Card className="hover-lift">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">SIM卡槽</CardTitle>
                        <Signal className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{device.slots?.length || 0}/2</div>
                        <p className="text-xs text-muted-foreground mt-1">已配置卡槽数</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">概览</TabsTrigger>
                    <TabsTrigger value="slots">SIM卡槽</TabsTrigger>
                    <TabsTrigger value="messages">短信记录</TabsTrigger>
                    <TabsTrigger value="calls">通话记录</TabsTrigger>
                    <TabsTrigger value="control">设备控制</TabsTrigger>
                    <TabsTrigger value="settings">设置</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>设备基本信息</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">设备ID</span>
                                    <span className="text-sm font-mono">{device.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">设备名称</span>
                                    <span className="text-sm">{device.name || '未命名'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">IP地址</span>
                                    <span className="text-sm font-mono">{device.ip || '--'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">状态</span>
                                    <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                                        {device.status === 'online' ? '在线' : '离线'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>网络信息</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {latestStatus ? (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">WiFi名称</span>
                                            <span className="text-sm">{latestStatus.wifiSsid || '--'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">信号强度</span>
                                            <span className="text-sm">{latestStatus.wifiStrength || 0}%</span>
                                        </div>
                                        {latestStatus.temp !== null && (
                                            <div className="flex justify-between">
                                                <span className="text-sm text-muted-foreground">温度</span>
                                                <span className="text-sm">{latestStatus.temp}°C</span>
                                            </div>
                                        )}
                                        {latestStatus.uptime !== null && (
                                            <div className="flex justify-between">
                                                <span className="text-sm text-muted-foreground">运行时长</span>
                                                <span className="text-sm">{Math.floor((latestStatus.uptime || 0) / 3600)}小时</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">暂无状态数据</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {device.alerts && device.alerts.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>最近告警</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {device.alerts.map((alert) => (
                                        <div key={alert.id} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/20">
                                            <div className="flex items-center space-x-2">
                                                <AlertCircle className="h-4 w-4 text-destructive" />
                                                <span className="text-sm">{alert.message}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(alert.timestamp).toLocaleString('zh-CN')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* SIM Slots Tab */}
                <TabsContent value="slots" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {[1, 2].map((slotNum) => {
                            const slot = device.slots?.find(s => s.slotNum === slotNum);
                            return (
                                <Card key={slotNum} className="hover-lift">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <span>卡槽 {slotNum}</span>
                                            {slot ? getSimStatusBadge(slot.simStatus) : <Badge variant="outline">未插入</Badge>}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {slot ? (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-muted-foreground">运营商</span>
                                                    <span className="text-sm">{getOperatorName(slot.operator)}</span>
                                                </div>
                                                {slot.phoneNumber && (
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-muted-foreground">手机号</span>
                                                        <span className="text-sm font-mono">{slot.phoneNumber}</span>
                                                    </div>
                                                )}
                                                {slot.signalStrength !== null && (
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-muted-foreground">信号强度</span>
                                                        <span className="text-sm">{slot.signalStrength}%</span>
                                                    </div>
                                                )}
                                                {slot.imsi && (
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-muted-foreground">IMSI</span>
                                                        <span className="text-sm font-mono text-xs">{slot.imsi}</span>
                                                    </div>
                                                )}
                                                {slot.iccid && (
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-muted-foreground">ICCID</span>
                                                        <span className="text-sm font-mono text-xs">{slot.iccid}</span>
                                                    </div>
                                                )}
                                                <div className="flex space-x-2 pt-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => executeCommand('slotrst', { p1: slotNum })}
                                                        disabled={executing === 'slotrst'}
                                                    >
                                                        {executing === 'slotrst' ? (
                                                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="h-3 w-3 mr-1" />
                                                        )}
                                                        重启卡槽
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">未插入SIM卡</p>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* Messages Tab */}
                <TabsContent value="messages" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>最近短信</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {device.messages && device.messages.length > 0 ? (
                                <div className="space-y-3">
                                    {device.messages.map((msg) => (
                                        <div key={msg.id} className={`p-3 rounded-lg border-l-4 bg-muted/20 ${msg.direction === 'incoming' ? 'border-l-blue-500/60' : 'border-l-green-500/60'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center space-x-2">
                                                    {msg.direction === 'incoming' ? (
                                                        <MessageSquare className="h-4 w-4 text-blue-500" />
                                                    ) : (
                                                        <MessageSquare className="h-4 w-4 text-green-500" />
                                                    )}
                                                    <span className="text-sm font-mono">{msg.phone}</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(msg.timestamp).toLocaleString('zh-CN')}
                                                </span>
                                            </div>
                                            <p className="text-sm">{msg.content}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">暂无短信记录</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Calls Tab */}
                <TabsContent value="calls" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>最近通话</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {device.calls && device.calls.length > 0 ? (
                                <div className="space-y-3">
                                    {device.calls.map((call) => (
                                        <div key={call.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                                            <div className="flex items-center space-x-3">
                                                {call.direction === 'incoming' ? (
                                                    <Phone className="h-4 w-4 text-blue-500" />
                                                ) : (
                                                    <Phone className="h-4 w-4 text-green-500" />
                                                )}
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm font-mono">{call.phone}</span>
                                                        {call.connected ? (
                                                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                        ) : (
                                                            <XCircle className="h-3 w-3 text-gray-500" />
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(call.startTime).toLocaleString('zh-CN')}
                                                        {call.duration && ` · ${Math.floor(call.duration / 60)}分${call.duration % 60}秒`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">暂无通话记录</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Control Tab */}
                <TabsContent value="control" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>设备控制</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid gap-3 md:grid-cols-2">
                                <Button
                                    variant="outline"
                                    onClick={() => executeCommand('restart')}
                                    disabled={executing === 'restart'}
                                >
                                    {executing === 'restart' ? (
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Power className="h-4 w-4 mr-2" />
                                    )}
                                    重启设备
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => executeCommand('otanow')}
                                    disabled={executing === 'otanow'}
                                >
                                    {executing === 'otanow' ? (
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4 mr-2" />
                                    )}
                                    OTA升级
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => executeCommand('stat')}
                                    disabled={executing === 'stat'}
                                >
                                    {executing === 'stat' ? (
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Radio className="h-4 w-4 mr-2" />
                                    )}
                                    查询状态
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>设备设置</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">设备名称</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-input/60 rounded-lg bg-background"
                                    defaultValue={device.name || ''}
                                    placeholder="输入设备名称"
                                    onBlur={async (e) => {
                                        const newName = e.target.value;
                                        if (newName !== device.name) {
                                            try {
                                                const res = await fetch(`/api/devices/${deviceId}`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ name: newName })
                                                });
                                                if (res.ok) {
                                                    fetchDevice();
                                                }
                                            } catch (e) {
                                                console.error(e);
                                            }
                                        }
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">自动接听</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={device.autoAnswer}
                                        onChange={async (e) => {
                                            try {
                                                const res = await fetch(`/api/devices/${deviceId}`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ autoAnswer: e.target.checked })
                                                });
                                                if (res.ok) {
                                                    fetchDevice();
                                                }
                                            } catch (err) {
                                                console.error(err);
                                            }
                                        }}
                                    />
                                    <span className="text-sm text-muted-foreground">启用自动接听来电</span>
                                </div>
                            </div>
                            {device.autoAnswer && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">TTS内容</label>
                                    <textarea
                                        className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                                        defaultValue={device.ttsContent || ''}
                                        placeholder="输入TTS语音内容"
                                        onBlur={async (e) => {
                                            const newContent = e.target.value;
                                            if (newContent !== device.ttsContent) {
                                                try {
                                                    const res = await fetch(`/api/devices/${deviceId}`, {
                                                        method: 'PATCH',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ ttsContent: newContent })
                                                    });
                                                    if (res.ok) {
                                                        fetchDevice();
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
