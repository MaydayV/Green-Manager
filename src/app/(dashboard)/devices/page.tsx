'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Plus, Wifi, Signal, CheckCircle2, XCircle, Radio, Tag, Users, Search, ArrowUpDown, FolderTree } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AddDeviceDialog } from '@/components/AddDeviceDialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BatchOperationProgress } from '@/components/BatchOperationProgress';
import { cachedFetch, cacheKeys, dataCache } from '@/lib/cache';
import { sseClient } from '@/lib/sse-client';
import { PageHeader } from '@/components/PageHeader';

interface Device {
    id: string;
    name?: string;
    status: string;
    ip?: string;
    lastSeen?: string;
    tags?: string;
    group?: { id: string; name: string; color?: string };
    statuses?: { wifiStrength: number }[];
    slots?: { slotNum: number; operator?: string; simStatus?: string; signalStrength?: number; phoneNumber?: string }[];
}

interface DeviceGroup {
    id: string;
    name: string;
    color?: string;
}

type SortField = 'name' | 'status' | 'lastSeen' | 'ip';
type SortOrder = 'asc' | 'desc';

export default function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [multiselectMode, setMultiselectMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('lastSeen');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [batchId, setBatchId] = useState<string | null>(null);
    const [batchTotal, setBatchTotal] = useState(0);
    const [groups, setGroups] = useState<DeviceGroup[]>([]);
    const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('__all__');
    const [assignGroupDialogOpen, setAssignGroupDialogOpen] = useState(false);
    const [selectedGroupForAssign, setSelectedGroupForAssign] = useState<string>('');

    // Fetch devices with cache
    const fetchDevices = useCallback(async () => {
        setLoading(true);
        try {
            const data = await cachedFetch<Device[]>(
                '/api/devices',
                undefined,
                cacheKeys.devices(),
                2 * 60 * 1000 // 2分钟缓存
            );
            setDevices(data);
        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    }, []);

    const fetchGroups = useCallback(async () => {
        try {
            const res = await fetch('/api/groups');
            if (res.ok) {
                const data = await res.json();
                setGroups(data);
            }
        } catch (e) {
            console.error('Failed to fetch groups:', e);
        }
    }, []);

    useEffect(() => {
        fetchDevices();
        fetchGroups();

        // 订阅SSE实时更新
        const unsubscribeDevice = sseClient.on('device:status:update', (event) => {
            // 更新设备状态
            setDevices(prev => prev.map(device => 
                device.id === event.data.deviceId 
                    ? { ...device, ...event.data }
                    : device
            ));
            // 清除缓存，确保下次获取最新数据
            dataCache.delete(cacheKeys.devices());
        });

        const unsubscribeOnline = sseClient.on('device:online', (event) => {
            setDevices(prev => prev.map(device => 
                device.id === event.data.deviceId 
                    ? { ...device, status: 'online', lastSeen: new Date().toISOString() }
                    : device
            ));
        });

        const unsubscribeOffline = sseClient.on('device:offline', (event) => {
            setDevices(prev => prev.map(device => 
                device.id === event.data.deviceId 
                    ? { ...device, status: 'offline' }
                    : device
            ));
        });

        return () => {
            unsubscribeDevice();
            unsubscribeOnline();
            unsubscribeOffline();
        };
    }, [fetchDevices]);

    // 搜索和排序
    useEffect(() => {
        let filtered = [...devices];

        // 分组筛选
        if (selectedGroupFilter && selectedGroupFilter !== '__all__') {
            filtered = filtered.filter(device => device.group?.id === selectedGroupFilter);
        }

        // 搜索过滤
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(device => 
                device.name?.toLowerCase().includes(query) ||
                device.id.toLowerCase().includes(query) ||
                device.ip?.toLowerCase().includes(query) ||
                device.group?.name.toLowerCase().includes(query) ||
                (device.tags && JSON.parse(device.tags || '[]').some((tag: string) => 
                    tag.toLowerCase().includes(query)
                ))
            );
        }

        // 排序
        filtered.sort((a, b) => {
            let aVal: any, bVal: any;
            
            switch (sortField) {
                case 'name':
                    aVal = a.name || a.id;
                    bVal = b.name || b.id;
                    break;
                case 'status':
                    aVal = a.status;
                    bVal = b.status;
                    break;
                case 'lastSeen':
                    aVal = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
                    bVal = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
                    break;
                case 'ip':
                    aVal = a.ip || '';
                    bVal = b.ip || '';
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredDevices(filtered);
    }, [devices, searchQuery, sortField, sortOrder, selectedGroupFilter]);

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleBatchAction = async (command: string) => {
        if (selectedIds.size === 0) return;
        if (!confirm(`确定要对 ${selectedIds.size} 台设备执行 ${command} 操作吗？`)) return;

        try {
            const res = await fetch('/api/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetIds: Array.from(selectedIds),
                    command: command,
                    params: {},
                    batchName: `批量${command}`
                })
            });
            if (res.ok) {
                const data = await res.json();
                setBatchId(data.batchId);
                setBatchTotal(selectedIds.size);
                const currentSelected = selectedIds.size;
                setSelectedIds(new Set());
                setMultiselectMode(false);
                // 清除缓存，强制刷新
                dataCache.delete(cacheKeys.devices());
                fetchDevices();
            } else {
                alert('批量操作启动失败');
            }
        } catch (e) { 
            alert('批量操作出错'); 
        }
    };

    const handleAssignToGroup = () => {
        if (selectedIds.size === 0) {
            alert('请先选择要分配的设备');
            return;
        }
        setSelectedGroupForAssign('');
        setAssignGroupDialogOpen(true);
    };

    const handleConfirmAssignGroup = async () => {
        if (selectedIds.size === 0 || !selectedGroupForAssign) {
            alert('请选择分组');
            return;
        }
        
        const groupId = selectedGroupForAssign;

        try {
            const deviceIdsArray = Array.from(selectedIds);
            
            // 如果选择的是"无分组"，需要逐个移除设备的分组
            if (groupId === '__none__') {
                for (const deviceId of deviceIdsArray) {
                    const res = await fetch(`/api/devices/${deviceId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ groupId: null })
                    });
                    if (!res.ok) throw new Error(`更新设备 ${deviceId} 失败`);
                }
            } else {
                // 批量分配到分组 - 先获取分组中现有设备，然后合并
                const groupRes = await fetch(`/api/groups/${groupId}`);
                if (groupRes.ok) {
                    const group = await groupRes.json();
                    const existingDeviceIds = group.devices?.map((d: any) => d.id) || [];
                    // 合并现有设备和选中设备，去重
                    const allDeviceIds = Array.from(new Set([...existingDeviceIds, ...deviceIdsArray]));
                    
                    const res = await fetch(`/api/groups/${groupId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            deviceIds: allDeviceIds
                        })
                    });
                    if (!res.ok) {
                        throw new Error('分配失败');
                    }
                } else {
                    throw new Error('获取分组信息失败');
                }
            }

            setAssignGroupDialogOpen(false);
            const successCount = deviceIdsArray.length;
            setSelectedIds(new Set());
            setMultiselectMode(false);
            dataCache.delete(cacheKeys.devices());
            fetchDevices();
            fetchGroups();
            alert(`成功将 ${successCount} 台设备${groupId === '__none__' ? '从分组移除' : '分配到分组'}`);
        } catch (e: any) {
            console.error('Failed to assign devices to group:', e);
            alert(`分配设备到分组失败: ${e.message || '未知错误'}`);
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'online') {
            return <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />在线</Badge>;
        }
        return <Badge variant="secondary" className="bg-gray-500/10 text-gray-500"><XCircle className="h-3 w-3 mr-1" />离线</Badge>;
    };

    const formatLastSeen = (lastSeen?: string) => {
        if (!lastSeen) return '从未在线';
        const date = new Date(lastSeen);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}小时前`;
        const days = Math.floor(hours / 24);
        return `${days}天前`;
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="设备管理"
                description="管理和监控所有设备"
                actions={
                    <>
                        {selectedIds.size > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="destructive">
                                        批量操作 ({selectedIds.size})
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={handleAssignToGroup}>
                                        <Users className="h-4 w-4 mr-2" />
                                        分配到分组
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBatchAction('restart')}>重启设备</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBatchAction('otanow')}>OTA 升级</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <Button variant="outline" onClick={() => {
                            setMultiselectMode(!multiselectMode);
                            setSelectedIds(new Set());
                        }}>
                            {multiselectMode ? '取消选择' : '批量选择'}
                        </Button>
                        <Button variant="outline" size="icon" onClick={fetchDevices} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <AddDeviceDialog />
                    </>
                }
            />

            {/* 搜索和排序 */}
            <div className="flex items-center space-x-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="搜索设备名称、ID、IP或标签..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                        <SelectTrigger className="w-[180px]">
                            <FolderTree className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="所有分组" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">所有分组</SelectItem>
                            {groups.map(group => (
                                <SelectItem key={group.id} value={group.id}>
                                    <div className="flex items-center space-x-2">
                                        <div
                                            className="h-3 w-3 rounded-full"
                                            style={{ backgroundColor: group.color || '#3b82f6' }}
                                        />
                                        <span>{group.name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={`${sortField}:${sortOrder}`} onValueChange={(value) => {
                        const [field, order] = value.split(':');
                        setSortField(field as SortField);
                        setSortOrder(order as SortOrder);
                    }}>
                        <SelectTrigger className="w-[200px]">
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="lastSeen:desc">最后在线 ↓</SelectItem>
                            <SelectItem value="lastSeen:asc">最后在线 ↑</SelectItem>
                            <SelectItem value="name:asc">名称 A-Z</SelectItem>
                            <SelectItem value="name:desc">名称 Z-A</SelectItem>
                            <SelectItem value="status:desc">状态</SelectItem>
                            <SelectItem value="ip:asc">IP地址</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-lg border bg-card shadow-sm">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b border-border/40 bg-muted/30">
                            <tr className="border-b transition-colors">
                                {multiselectMode && (
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-12">
                                        <Checkbox
                                            checked={selectedIds.size === devices.length && devices.length > 0}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedIds(new Set(devices.map(d => d.id)));
                                                } else {
                                                    setSelectedIds(new Set());
                                                }
                                            }}
                                        />
                                    </th>
                                )}
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">设备名称</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">IP地址</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">状态</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">WiFi信号</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">SIM卡状态</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">最后在线</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">操作</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {filteredDevices.map((device, index) => (
                                <tr 
                                    key={device.id} 
                                    className={`border-b transition-all duration-200 hover:bg-muted/40 hover:shadow-sm ${selectedIds.has(device.id) ? 'bg-primary/10 border-primary/30' : 'bg-card'} ${index % 2 === 0 ? '' : 'bg-muted/10'}`}
                                >
                                    {multiselectMode && (
                                        <td className="p-4 align-middle">
                                            <Checkbox
                                                checked={selectedIds.has(device.id)}
                                                onCheckedChange={() => toggleSelect(device.id)}
                                            />
                                        </td>
                                    )}
                                    <td className="p-4 align-middle">
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-1.5 rounded-lg ${device.status === 'online' ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
                                                <Radio className={`h-4 w-4 ${device.status === 'online' ? 'text-green-500' : 'text-gray-400'}`} />
                                            </div>
                                            <div className="flex-1">
                                                <Link 
                                                    href={`/devices/${device.id}`}
                                                    className="font-medium hover:text-primary transition-colors group block"
                                                >
                                                    <span className="group-hover:underline">{device.name || `设备-${device.id.slice(0, 8)}`}</span>
                                                </Link>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    {device.group && (
                                                        <Badge variant="outline" className="text-xs" style={{ borderColor: device.group.color || '#3b82f6' }}>
                                                            <Users className="h-3 w-3 mr-1" />
                                                            {device.group.name}
                                                        </Badge>
                                                    )}
                                                    {device.tags && (() => {
                                                        try {
                                                            const tags = JSON.parse(device.tags);
                                                            return tags.map((tag: string, idx: number) => (
                                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                                    <Tag className="h-3 w-3 mr-1" />
                                                                    {tag}
                                                                </Badge>
                                                            ));
                                                        } catch {
                                                            return null;
                                                        }
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <span className="font-mono text-sm bg-muted/50 px-2 py-1 rounded">{device.ip || '--'}</span>
                                    </td>
                                    <td className="p-4 align-middle">
                                        {getStatusBadge(device.status)}
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="flex items-center space-x-2">
                                            <div className={`p-1 rounded ${device.statuses?.[0]?.wifiStrength ? 'bg-blue-500/10' : 'bg-gray-500/10'}`}>
                                                <Wifi className={`h-3.5 w-3.5 ${device.statuses?.[0]?.wifiStrength ? 'text-blue-500' : 'text-gray-400'}`} />
                                            </div>
                                            <span className="text-sm font-medium">
                                                {device.statuses?.[0]?.wifiStrength ? `${device.statuses[0].wifiStrength}%` : '--'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                                            {device.slots && device.slots.length > 0 ? (
                                                device.slots.map((slot, idx) => (
                                                    <div key={idx} className="flex items-center space-x-1.5 bg-muted/50 px-2 py-1 rounded-md">
                                                        <Signal className={`h-3 w-3 ${slot.simStatus === 'OK' ? 'text-green-500' : 'text-gray-400'}`} />
                                                        <span className="text-xs font-medium">
                                                            卡{slot.slotNum}: {slot.simStatus === 'OK' ? '正常' : slot.simStatus || '--'}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground text-sm">--</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <span className="text-sm text-muted-foreground">
                                            {formatLastSeen(device.lastSeen)}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        <Link href={`/devices/${device.id}`}>
                                            <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">查看详情</Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {filteredDevices.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={multiselectMode ? 8 : 7} className="p-12 text-center">
                                        <div className="flex flex-col items-center space-y-3">
                                            {searchQuery ? (
                                                <>
                                                    <Search className="h-12 w-12 text-muted-foreground/30" />
                                                    <p className="text-muted-foreground font-medium">未找到匹配的设备</p>
                                                    <p className="text-sm text-muted-foreground/70">尝试修改搜索条件</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Radio className="h-12 w-12 text-muted-foreground/30" />
                                                    <p className="text-muted-foreground font-medium">暂无设备</p>
                                                    <p className="text-sm text-muted-foreground/70">点击右上角"添加设备"按钮添加第一个设备</p>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {loading && (
                                <tr>
                                    <td colSpan={multiselectMode ? 8 : 7} className="p-12 text-center">
                                        <div className="flex flex-col items-center space-y-3">
                                            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                                            <p className="text-sm text-muted-foreground">加载中...</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {batchId && (
                <BatchOperationProgress
                    batchId={batchId}
                    total={batchTotal}
                    onComplete={() => {
                        setBatchId(null);
                        setBatchTotal(0);
                        dataCache.delete(cacheKeys.devices());
                        fetchDevices();
                    }}
                />
            )}

            {/* 分配分组对话框 */}
            <Dialog open={assignGroupDialogOpen} onOpenChange={setAssignGroupDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>分配到分组</DialogTitle>
                        <DialogDescription>
                            将选中的 {selectedIds.size} 台设备分配到分组
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Select value={selectedGroupForAssign} onValueChange={setSelectedGroupForAssign}>
                            <SelectTrigger>
                                <SelectValue placeholder="选择分组" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">无分组（移除分组）</SelectItem>
                                {groups.map(group => (
                                    <SelectItem key={group.id} value={group.id}>
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="h-3 w-3 rounded-full"
                                                style={{ backgroundColor: group.color || '#3b82f6' }}
                                            />
                                            <span>{group.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignGroupDialogOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={handleConfirmAssignGroup} disabled={!selectedGroupForAssign}>
                            确认
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
