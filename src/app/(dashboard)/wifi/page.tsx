'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RefreshCw, Plus, Trash2, Edit, Wifi, CheckCircle2, XCircle, Radio } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/PageHeader';

interface WifiTemplate {
    id: string;
    name: string;
    ssid: string;
    password: string;
    description?: string;
    _count?: { deviceConfigs: number };
}

interface Device {
    id: string;
    name?: string;
    status: string;
    ip?: string;
}

export default function WifiPage() {
    const [templates, setTemplates] = useState<WifiTemplate[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [applyDialogOpen, setApplyDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
    const [applying, setApplying] = useState(false);
    const [formData, setFormData] = useState({ name: '', ssid: '', password: '', description: '' });

    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/wifi/templates');
            if (res.ok) {
                setTemplates(await res.json());
            }
        } catch (e) {
            console.error('Failed to fetch templates:', e);
        }
    };

    const fetchDevices = async () => {
        try {
            const res = await fetch('/api/devices');
            if (res.ok) {
                setDevices(await res.json());
            }
        } catch (e) {
            console.error('Failed to fetch devices:', e);
        }
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchTemplates(), fetchDevices()]).finally(() => setLoading(false));
    }, []);

    const handleCreateTemplate = async () => {
        try {
            const res = await fetch('/api/wifi/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setTemplateDialogOpen(false);
                setFormData({ name: '', ssid: '', password: '', description: '' });
                fetchTemplates();
            }
        } catch (e) {
            console.error('Failed to create template:', e);
            alert('创建模板失败');
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('确定要删除这个WiFi模板吗？')) return;
        try {
            const res = await fetch(`/api/wifi/templates/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchTemplates();
            } else {
                alert('删除失败');
            }
        } catch (e) {
            console.error('Failed to delete template:', e);
            alert('删除失败');
        }
    };

    const handleApplyWifi = async () => {
        if (selectedDevices.size === 0) {
            alert('请至少选择一个设备');
            return;
        }

        if (selectedTemplate !== '__manual__' && !selectedTemplate && !formData.ssid) {
            alert('请选择模板或输入WiFi信息');
            return;
        }

        setApplying(true);
        try {
            const res = await fetch('/api/wifi/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceIds: Array.from(selectedDevices),
                    templateId: selectedTemplate && selectedTemplate !== '__manual__' ? selectedTemplate : null,
                    ssid: formData.ssid || null,
                    password: formData.password || null
                })
            });

            if (res.ok) {
                const data = await res.json();
                const successCount = data.results?.filter((r: any) => r.success).length || 0;
                const failCount = data.results?.length - successCount || 0;
                alert(`应用完成：成功 ${successCount} 台，失败 ${failCount} 台`);
                setApplyDialogOpen(false);
                setSelectedDevices(new Set());
                setSelectedTemplate('');
                setFormData({ name: '', ssid: '', password: '', description: '' });
            } else {
                alert('应用WiFi配置失败');
            }
        } catch (e) {
            console.error('Failed to apply WiFi:', e);
            alert('应用WiFi配置失败');
        } finally {
            setApplying(false);
        }
    };

    const toggleDevice = (deviceId: string) => {
        const next = new Set(selectedDevices);
        if (next.has(deviceId)) {
            next.delete(deviceId);
        } else {
            next.add(deviceId);
        }
        setSelectedDevices(next);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="WiFi热点管理"
                description="管理WiFi配置模板并批量应用到设备"
                actions={
                    <>
                        <Button variant="outline" size="icon" onClick={() => { fetchTemplates(); fetchDevices(); }} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Plus className="h-4 w-4 mr-2" /> 新建模板
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>新建WiFi配置模板</DialogTitle>
                                <DialogDescription>创建可复用的WiFi配置模板</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="template-name">模板名称</Label>
                                    <Input
                                        id="template-name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="例如：办公室WiFi"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="template-ssid">WiFi名称 (SSID)</Label>
                                    <Input
                                        id="template-ssid"
                                        value={formData.ssid}
                                        onChange={(e) => setFormData({ ...formData, ssid: e.target.value })}
                                        placeholder="WiFi热点名称"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="template-password">WiFi密码</Label>
                                    <Input
                                        id="template-password"
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="WiFi密码"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="template-description">描述</Label>
                                    <Textarea
                                        id="template-description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="模板描述（可选）"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>取消</Button>
                                <Button onClick={handleCreateTemplate}>创建</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Wifi className="h-4 w-4 mr-2" /> 批量应用
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>批量应用WiFi配置</DialogTitle>
                                <DialogDescription>选择设备和WiFi配置，批量应用到设备</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>选择WiFi配置</Label>
                                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择模板或手动输入" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__manual__">手动输入</SelectItem>
                                            {templates.map(template => (
                                                <SelectItem key={template.id} value={template.id}>
                                                    {template.name} ({template.ssid})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {(selectedTemplate === '__manual__' || selectedTemplate === '') && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="apply-ssid">WiFi名称 (SSID)</Label>
                                            <Input
                                                id="apply-ssid"
                                                value={formData.ssid}
                                                onChange={(e) => setFormData({ ...formData, ssid: e.target.value })}
                                                placeholder="WiFi热点名称"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="apply-password">WiFi密码</Label>
                                            <Input
                                                id="apply-password"
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                placeholder="WiFi密码"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="space-y-2">
                                    <Label>选择设备 ({selectedDevices.size} 已选择)</Label>
                                    <div className="border rounded-lg p-3 max-h-60 overflow-y-auto">
                                        <div className="space-y-2">
                                            {devices.map(device => (
                                                <div key={device.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        checked={selectedDevices.has(device.id)}
                                                        onCheckedChange={() => toggleDevice(device.id)}
                                                    />
                                                    <div className="flex items-center space-x-2 flex-1">
                                                        <Radio className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">{device.name || device.id.slice(0, 8)}</span>
                                                        <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className="text-xs">
                                                            {device.status === 'online' ? '在线' : '离线'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>取消</Button>
                                <Button onClick={handleApplyWifi} disabled={applying}>
                                    {applying ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            应用中...
                                        </>
                                    ) : (
                                        '应用配置'
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    </>
                }
            />

            <div>
                <h3 className="text-lg font-semibold mb-3">WiFi配置模板</h3>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : templates.length === 0 ? (
                    <Card>
                        <CardContent className="text-center py-16">
                            <Wifi className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">暂无WiFi模板</p>
                            <p className="text-xs text-muted-foreground mt-1">点击"新建模板"创建第一个模板</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {templates.map(template => (
                            <Card key={template.id} className="hover-lift">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Wifi className="h-5 w-5 text-primary" />
                                            <CardTitle className="text-lg">{template.name}</CardTitle>
                                        </div>
                                        <div className="flex space-x-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive"
                                                onClick={() => handleDeleteTemplate(template.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-sm text-muted-foreground">SSID: </span>
                                            <span className="text-sm font-mono">{template.ssid}</span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-muted-foreground">密码: </span>
                                            <span className="text-sm font-mono">••••••••</span>
                                        </div>
                                        {template.description && (
                                            <p className="text-sm text-muted-foreground">{template.description}</p>
                                        )}
                                        <div className="flex items-center space-x-2 pt-2 border-t">
                                            <span className="text-xs text-muted-foreground">
                                                已应用到 {template._count?.deviceConfigs || 0} 台设备
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
