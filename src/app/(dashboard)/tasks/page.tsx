'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Plus, Trash2, Play, Clock, Zap, Bell, Settings, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/PageHeader';

interface Task {
    id: string;
    name: string;
    schedule: string;
    command: string;
    deviceId?: string;
    enabled: boolean;
    lastRun?: string;
    device?: { name: string };
    taskType?: string; // 'cron' | 'event' | 'delay'
    triggerType?: string;
    triggerConfig?: string;
    actionConfig?: string;
}

interface Device {
    id: string;
    name?: string;
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        taskType: 'cron', // 'cron' | 'event' | 'delay'
        schedule: '0 4 * * *', // Default daily at 4am
        command: 'restart',
        deviceId: '',
        params: '{}',
        enabled: true,
        // Event trigger config
        triggerType: 'sms_received',
        triggerConfig: JSON.stringify({ keyword: '', sender: '' }),
        // Delay config
        delayMinutes: 5,
        // Action config
        actionConfig: JSON.stringify({})
    });

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/tasks');
            if (res.ok) {
                const data = await res.json();
                setTasks(data || []);
            } else {
                console.error('Failed to fetch tasks:', res.status);
            }
        } catch (e) {
            console.error('Error fetching tasks:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchDevices = async () => {
        try {
            const res = await fetch('/api/devices');
            if (res.ok) setDevices(await res.json());
        } catch (e) { }
    };

    useEffect(() => {
        fetchTasks();
        fetchDevices();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这个任务吗？')) return;
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        fetchTasks();
    };

    const handleToggle = async (task: Task) => {
        try {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !task.enabled })
            });
            if (res.ok) {
                fetchTasks();
            } else {
                alert('操作失败');
            }
        } catch (e) {
            console.error('Toggle task error:', e);
            alert('操作失败');
        }
    };

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        
        // Parse delay schedule
        let delayMinutes = 5;
        if (task.schedule?.startsWith('delay:')) {
            delayMinutes = parseInt(task.schedule.replace('delay:', '')) || 5;
        }
        
        setFormData({
            name: task.name,
            taskType: task.taskType || 'cron',
            schedule: task.schedule?.startsWith('delay:') ? '0 4 * * *' : (task.schedule || '0 4 * * *'),
            command: task.command,
            deviceId: task.deviceId || '',
            params: task.actionConfig || '{}',
            enabled: task.enabled,
            triggerType: task.triggerType || 'sms_received',
            triggerConfig: task.triggerConfig || JSON.stringify({ keyword: '', sender: '' }),
            delayMinutes: delayMinutes,
            actionConfig: task.actionConfig || JSON.stringify({})
        });
        setDialogOpen(true);
    };

    const handleCreate = async () => {
        if (!formData.name) {
            alert('请输入任务名称');
            return;
        }

        const payload: any = {
            name: formData.name,
            taskType: formData.taskType,
            schedule: formData.schedule,
            command: formData.command,
            deviceId: formData.deviceId || null,
            params: formData.params,
            enabled: formData.enabled,
        };

        if (formData.taskType === 'event') {
            payload.triggerType = formData.triggerType;
            payload.triggerConfig = formData.triggerConfig;
        }

        if (formData.taskType === 'delay') {
            payload.schedule = `delay:${formData.delayMinutes}`;
        }

        const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
        const method = editingTask ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            setDialogOpen(false);
            setEditingTask(null);
            setFormData({
                name: '',
                taskType: 'cron',
                schedule: '0 4 * * *',
                command: 'restart',
                deviceId: '',
                params: '{}',
                enabled: true,
                triggerType: 'sms_received',
                triggerConfig: JSON.stringify({ keyword: '', sender: '' }),
                delayMinutes: 5,
                actionConfig: JSON.stringify({})
            });
            fetchTasks();
        } else {
            alert('保存失败');
        }
    };

    const handleRunNow = async (task: Task) => {
        if (!confirm('确定要立即执行这个任务吗？')) return;
        try {
            const res = await fetch(`/api/tasks/${task.id}/run`, { method: 'POST' });
            if (res.ok) {
                alert('任务已触发');
                fetchTasks();
            } else {
                alert('执行失败');
            }
        } catch (e) {
            alert('执行失败');
        }
    };

    const getTaskTypeLabel = (type?: string) => {
        const map: Record<string, string> = {
            'cron': '定时任务',
            'event': '事件触发',
            'delay': '延时任务'
        };
        return map[type || 'cron'] || '定时任务';
    };

    const getTriggerTypeLabel = (type?: string) => {
        const map: Record<string, string> = {
            'sms_received': '收到短信',
            'call_incoming': '来电',
            'device_offline': '设备离线',
            'device_online': '设备上线',
            'signal_low': '信号过低',
            'alert_triggered': '告警触发'
        };
        return map[type || ''] || type || '未知';
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="自动化任务"
                description="创建定时任务和事件驱动的自动化规则"
                actions={
                    <Dialog open={dialogOpen} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) {
                            setEditingTask(null);
                            setFormData({
                                name: '',
                                taskType: 'cron',
                                schedule: '0 4 * * *',
                                command: 'restart',
                                deviceId: '',
                                params: '{}',
                                enabled: true,
                                triggerType: 'sms_received',
                                triggerConfig: JSON.stringify({ keyword: '', sender: '' }),
                                delayMinutes: 5,
                                actionConfig: JSON.stringify({})
                            });
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> 新建任务
                            </Button>
                        </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingTask ? '编辑任务' : '新建任务'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>任务名称 *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="例如: 每日凌晨重启"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>任务类型 *</Label>
                                <Select value={formData.taskType} onValueChange={(v) => setFormData({ ...formData, taskType: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cron">
                                            <div className="flex items-center">
                                                <Clock className="mr-2 h-4 w-4" />
                                                定时任务 (Cron)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="event">
                                            <div className="flex items-center">
                                                <Zap className="mr-2 h-4 w-4" />
                                                事件触发
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="delay">
                                            <div className="flex items-center">
                                                <Bell className="mr-2 h-4 w-4" />
                                                延时任务
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.taskType === 'cron' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Cron 表达式 *</Label>
                                        <Input
                                            value={formData.schedule}
                                            onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                                            placeholder="0 4 * * * (每天凌晨4点)"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            格式: 分 时 日 月 周 | 示例: 0 4 * * * (每天4点), */30 * * * * (每30分钟)
                                        </p>
                                    </div>
                                </>
                            )}

                            {formData.taskType === 'event' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>触发事件 *</Label>
                                        <Select value={formData.triggerType} onValueChange={(v) => setFormData({ ...formData, triggerType: v })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="sms_received">收到短信</SelectItem>
                                                <SelectItem value="call_incoming">来电</SelectItem>
                                                <SelectItem value="device_offline">设备离线</SelectItem>
                                                <SelectItem value="device_online">设备上线</SelectItem>
                                                <SelectItem value="signal_low">信号过低</SelectItem>
                                                <SelectItem value="alert_triggered">告警触发</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {formData.triggerType === 'sms_received' && (
                                        <div className="space-y-2">
                                            <Label>触发条件 (JSON)</Label>
                                            <Textarea
                                                value={formData.triggerConfig}
                                                onChange={e => setFormData({ ...formData, triggerConfig: e.target.value })}
                                                placeholder='{"keyword": "验证码", "sender": "10086"}'
                                                className="font-mono text-sm"
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            {formData.taskType === 'delay' && (
                                <div className="space-y-2">
                                    <Label>延时时间 (分钟) *</Label>
                                    <Input
                                        type="number"
                                        value={formData.delayMinutes}
                                        onChange={e => setFormData({ ...formData, delayMinutes: parseInt(e.target.value) || 5 })}
                                        min="1"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>执行命令 *</Label>
                                <Select value={formData.command} onValueChange={(v) => setFormData({ ...formData, command: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="restart">设备重启</SelectItem>
                                        <SelectItem value="sendsms">发送短信</SelectItem>
                                        <SelectItem value="teldial">拨打电话</SelectItem>
                                        <SelectItem value="otanow">OTA 升级</SelectItem>
                                        <SelectItem value="stat">查询状态</SelectItem>
                                        <SelectItem value="slotrst">重启卡槽</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>目标设备</Label>
                                <Select value={formData.deviceId || "all"} onValueChange={(v) => setFormData({ ...formData, deviceId: v === "all" ? "" : v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择设备 (留空为所有设备)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">所有设备</SelectItem>
                                        {devices.map(device => (
                                            <SelectItem key={device.id} value={device.id}>
                                                {device.name || device.id}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>命令参数 (JSON)</Label>
                                <Textarea
                                    value={formData.params}
                                    onChange={e => setFormData({ ...formData, params: e.target.value })}
                                    placeholder='{"phone": "10086", "content": "查话费"}'
                                    className="font-mono text-sm"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="enabled"
                                    checked={formData.enabled}
                                    onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                                    className="rounded"
                                />
                                <Label htmlFor="enabled">启用任务</Label>
                            </div>

                            <div className="flex justify-end space-x-2 pt-4">
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                                <Button onClick={handleCreate}>保存</Button>
                            </div>
                        </div>
                    </DialogContent>
                    </Dialog>
                }
            />

            <div className="grid gap-4">
                {tasks.map(task => (
                    <Card key={task.id} className="hover-lift">
                        <CardContent className="flex items-center justify-between p-6">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center space-x-3">
                                    <h3 className="font-semibold text-lg">{task.name}</h3>
                                    <Badge variant={task.enabled ? "default" : "secondary"}>
                                        {task.enabled ? "启用" : "禁用"}
                                    </Badge>
                                    <Badge variant="outline">
                                        {getTaskTypeLabel(task.taskType)}
                                    </Badge>
                                    {task.taskType === 'event' && task.triggerType && (
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                                            {getTriggerTypeLabel(task.triggerType)}
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    {task.taskType === 'cron' && (
                                        <div>
                                            计划: <code className="bg-muted px-2 py-0.5 rounded text-xs">{task.schedule}</code>
                                        </div>
                                    )}
                                    {task.taskType === 'event' && (
                                        <div>
                                            触发: {getTriggerTypeLabel(task.triggerType)}
                                        </div>
                                    )}
                                    {task.taskType === 'delay' && (
                                        <div>
                                            延时: {task.schedule.replace('delay:', '')} 分钟
                                        </div>
                                    )}
                                    <div>
                                        命令: <span className="font-mono">{task.command}</span> |
                                        目标: {task.device?.name || task.deviceId || '所有设备'}
                                    </div>
                                    <div className="text-xs">
                                        上次运行: {task.lastRun ? new Date(task.lastRun).toLocaleString('zh-CN') : '从未运行'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => handleRunNow(task)}>
                                    <Play className="h-4 w-4 mr-1" /> 立即执行
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                                    <Edit className="h-4 w-4 mr-1" /> 编辑
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleToggle(task)}>
                                    {task.enabled ? '禁用' : '启用'}
                                </Button>
                                <Button variant="destructive" size="icon" onClick={() => handleDelete(task.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {tasks.length === 0 && !loading && (
                    <Card>
                        <CardContent className="text-center py-16">
                            <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">暂无自动化任务</p>
                            <p className="text-xs text-muted-foreground mt-1">点击右上角按钮创建第一个任务</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
