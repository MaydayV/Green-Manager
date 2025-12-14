'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RefreshCw, Plus, Trash2, Edit, Tag, Users, UserPlus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/PageHeader';

interface DeviceGroup {
    id: string;
    name: string;
    description?: string;
    color?: string;
    devices: { id: string; name?: string; status: string }[];
}

export default function GroupsPage() {
    const [groups, setGroups] = useState<DeviceGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<DeviceGroup | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', color: '#3b82f6' });
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [allDevices, setAllDevices] = useState<{ id: string; name?: string; status: string }[]>([]);
    const [selectedDevicesForAssign, setSelectedDevicesForAssign] = useState<Set<string>>(new Set());

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/groups');
            if (res.ok) {
                setGroups(await res.json());
            }
        } catch (e) {
            console.error('Failed to fetch groups:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
        fetchAllDevices();
    }, []);

    const fetchAllDevices = async () => {
        try {
            const res = await fetch('/api/devices');
            if (res.ok) {
                const devices = await res.json();
                setAllDevices(devices.map((d: any) => ({
                    id: d.id,
                    name: d.name,
                    status: d.status
                })));
            }
        } catch (e) {
            console.error('Failed to fetch devices:', e);
        }
    };

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setDialogOpen(false);
                setFormData({ name: '', description: '', color: '#3b82f6' });
                fetchGroups();
            }
        } catch (e) {
            console.error('Failed to create group:', e);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这个分组吗？分组中的设备将被移除。')) return;
        try {
            const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchGroups();
            }
        } catch (e) {
            console.error('Failed to delete group:', e);
        }
    };

    const handleEdit = (group: DeviceGroup) => {
        setEditingGroup(group);
        setFormData({
            name: group.name,
            description: group.description || '',
            color: group.color || '#3b82f6'
        });
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingGroup) return;
        try {
            const res = await fetch(`/api/groups/${editingGroup.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    deviceIds: editingGroup.devices.map(d => d.id)
                })
            });
            if (res.ok) {
                setEditDialogOpen(false);
                setEditingGroup(null);
                setFormData({ name: '', description: '', color: '#3b82f6' });
                fetchGroups();
            }
        } catch (e) {
            console.error('Failed to update group:', e);
            alert('更新分组失败');
        }
    };

    const handleAssignDevices = (group: DeviceGroup) => {
        setEditingGroup(group);
        setSelectedDevicesForAssign(new Set(group.devices.map(d => d.id)));
        setAssignDialogOpen(true);
    };

    const handleSaveAssign = async () => {
        if (!editingGroup) return;
        try {
            const res = await fetch(`/api/groups/${editingGroup.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceIds: Array.from(selectedDevicesForAssign)
                })
            });
            if (res.ok) {
                setAssignDialogOpen(false);
                setEditingGroup(null);
                setSelectedDevicesForAssign(new Set());
                fetchGroups();
            }
        } catch (e) {
            console.error('Failed to assign devices:', e);
            alert('分配设备失败');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="设备分组管理"
                description="创建分组并管理设备标签"
                actions={
                    <>
                        <Button variant="outline" size="icon" onClick={fetchGroups} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" /> 新建分组
                                </Button>
                            </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>新建设备分组</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">分组名称</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="例如：生产环境"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">描述</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="分组描述（可选）"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="color">颜色</Label>
                                    <Input
                                        id="color"
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                                <Button onClick={handleCreate}>创建</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : groups.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-16">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">暂无分组</p>
                        <p className="text-xs text-muted-foreground mt-1">点击"新建分组"创建第一个分组</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groups.map(group => (
                        <Card key={group.id} className="relative">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div
                                            className="h-4 w-4 rounded-full"
                                            style={{ backgroundColor: group.color || '#3b82f6' }}
                                        />
                                        <CardTitle className="text-lg">{group.name}</CardTitle>
                                    </div>
                                    <div className="flex space-x-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleEdit(group)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleAssignDevices(group)}
                                        >
                                            <UserPlus className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => handleDelete(group.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {group.description && (
                                    <p className="text-sm text-muted-foreground mb-3">{group.description}</p>
                                )}
                                <div className="flex items-center space-x-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                        {group.devices.length} 台设备
                                    </span>
                                </div>
                                {group.devices.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                        {group.devices.slice(0, 3).map(device => (
                                            <div key={device.id} className="flex items-center space-x-2 text-sm">
                                                <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className="text-xs">
                                                    {device.status === 'online' ? '在线' : '离线'}
                                                </Badge>
                                                <span className="text-muted-foreground">
                                                    {device.name || device.id.slice(0, 8)}
                                                </span>
                                            </div>
                                        ))}
                                        {group.devices.length > 3 && (
                                            <p className="text-xs text-muted-foreground">
                                                还有 {group.devices.length - 3} 台设备...
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* 编辑分组对话框 */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>编辑设备分组</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">分组名称</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">描述</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-color">颜色</Label>
                            <Input
                                id="edit-color"
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
                        <Button onClick={handleUpdate}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 分配设备对话框 */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>分配设备到分组</DialogTitle>
                        <DialogDescription>选择要添加到 "{editingGroup?.name}" 分组的设备</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="border rounded-lg p-3 max-h-96 overflow-y-auto">
                            <div className="space-y-2">
                                {allDevices.map(device => (
                                    <div key={device.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            checked={selectedDevicesForAssign.has(device.id)}
                                            onCheckedChange={(checked) => {
                                                const next = new Set(selectedDevicesForAssign);
                                                if (checked) {
                                                    next.add(device.id);
                                                } else {
                                                    next.delete(device.id);
                                                }
                                                setSelectedDevicesForAssign(next);
                                            }}
                                        />
                                        <div className="flex items-center space-x-2 flex-1">
                                            <span className="text-sm">{device.name || device.id.slice(0, 8)}</span>
                                            <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className="text-xs">
                                                {device.status === 'online' ? '在线' : '离线'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            已选择 {selectedDevicesForAssign.size} 台设备
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>取消</Button>
                        <Button onClick={handleSaveAssign}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
