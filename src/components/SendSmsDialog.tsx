'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Loader2, Users, Clock, Settings } from 'lucide-react';
import { isValidPhoneNumber, validatePhoneNumbers } from '@/lib/utils';

interface Device {
    id: string;
    name?: string;
    slots?: { id: string; slotNum: number; phoneNumber?: string }[];
}

interface SendSmsDialogProps {
    trigger?: React.ReactNode;
}

export function SendSmsDialog({ trigger }: SendSmsDialogProps) {
    const [open, setOpen] = useState(false);
    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
    const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
    const [phoneNumbers, setPhoneNumbers] = useState('');
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    
    // Batch/Scheduled options
    const [sendMode, setSendMode] = useState<'single' | 'batch' | 'scheduled'>('single');
    const [intervalSeconds, setIntervalSeconds] = useState(0);
    const [scheduledDateTime, setScheduledDateTime] = useState('');

    useEffect(() => {
        if (open) {
            fetchDevices();
        }
    }, [open]);

    const fetchDevices = async () => {
        try {
            const res = await fetch('/api/devices');
            if (res.ok) {
                const data = await res.json();
                setDevices(data);
                if (data.length > 0 && selectedDevices.length === 0) {
                    setSelectedDevices([data[0].id]);
                }
            }
        } catch (e) {
            console.error('Failed to fetch devices:', e);
        }
    };

    const handleSend = async () => {
        if (selectedDevices.length === 0) {
            alert('请至少选择一个设备');
            return;
        }

        if (!phoneNumbers.trim()) {
            alert('请输入至少一个手机号码');
            return;
        }

        // 验证手机号码格式
        const { valid, invalid } = validatePhoneNumbers(phoneNumbers);
        if (valid.length === 0) {
            if (invalid.length > 0) {
                alert(`手机号码格式不正确：${invalid.join(', ')}\n\n请输入正确的手机号码（11位中国手机号，如：13800138000，或国际格式，如：+8613800138000）`);
            } else {
                alert('请输入至少一个手机号码');
            }
            return;
        }

        if (invalid.length > 0) {
            const confirmContinue = confirm(
                `以下手机号码格式不正确，将被跳过：\n${invalid.join(', ')}\n\n是否继续发送给其他有效号码？`
            );
            if (!confirmContinue) {
                return;
            }
        }

        if (!content.trim()) {
            alert('请输入短信内容');
            return;
        }

        const phoneList = valid;

        setSending(true);
        try {
            if (sendMode === 'single' || (sendMode === 'batch' && selectedDevices.length === 1 && phoneList.length === 1)) {
                // Single send
                const deviceId = selectedDevices[0];
                const slot = selectedSlots[deviceId] || '1';
                const phone = phoneList[0];

                const res = await fetch(`/api/devices/${deviceId}/command`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        command: 'sendsms',
                        slot: slot,
                        phone: phone,
                        content: content
                    })
                });

                if (res.ok) {
                    alert('短信发送成功！');
                    resetForm();
                } else {
                    const error = await res.text();
                    alert(`发送失败: ${error}`);
                }
            } else {
                // Batch send
                const deviceConfigs = selectedDevices.map(deviceId => ({
                    deviceId,
                    slot: selectedSlots[deviceId] || '1'
                }));

                const res = await fetch('/api/sms/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        devices: deviceConfigs,
                        phones: phoneList,
                        content,
                        interval: intervalSeconds,
                        scheduledTime: sendMode === 'scheduled' && scheduledDateTime ? scheduledDateTime : undefined
                    })
                });

                if (res.ok) {
                    const result = await res.json();
                    if (result.scheduled) {
                        alert(`已创建定时发送任务，将在 ${new Date(scheduledDateTime).toLocaleString('zh-CN')} 发送 ${result.messageCount} 条短信`);
                    } else {
                        alert(`批量发送任务已创建，将发送 ${result.messageCount} 条短信${intervalSeconds > 0 ? `，间隔 ${intervalSeconds} 秒` : ''}`);
                    }
                    resetForm();
                } else {
                    const error = await res.json();
                    alert(`发送失败: ${error.error || error.details || '未知错误'}`);
                }
            }
        } catch (e) {
            alert('发送失败，请重试');
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    const resetForm = () => {
        setPhoneNumbers('');
        setContent('');
        setSelectedDevices(devices.length > 0 ? [devices[0].id] : []);
        setSelectedSlots({});
        setIntervalSeconds(0);
        setScheduledDateTime('');
        setSendMode('single');
    };

    const toggleDevice = (deviceId: string) => {
        if (selectedDevices.includes(deviceId)) {
            setSelectedDevices(selectedDevices.filter(id => id !== deviceId));
            const newSlots = { ...selectedSlots };
            delete newSlots[deviceId];
            setSelectedSlots(newSlots);
        } else {
            setSelectedDevices([...selectedDevices, deviceId]);
        }
    };

    const handleSlotChange = (deviceId: string, slot: string) => {
        setSelectedSlots({ ...selectedSlots, [deviceId]: slot });
    };

    const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 1);
        return now.toISOString().slice(0, 16);
    };

    return (
        <Dialog open={open} onOpenChange={(open) => {
            setOpen(open);
            if (!open) resetForm();
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Send className="mr-2 h-4 w-4" />
                        发送短信
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>发送短信</DialogTitle>
                </DialogHeader>
                
                <Tabs value={sendMode} onValueChange={(v) => setSendMode(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="single">单条发送</TabsTrigger>
                        <TabsTrigger value="batch">批量发送</TabsTrigger>
                        <TabsTrigger value="scheduled">定时发送</TabsTrigger>
                    </TabsList>

                    <TabsContent value="single" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>选择设备</Label>
                            <Select 
                                value={selectedDevices[0] || ''} 
                                onValueChange={(v) => setSelectedDevices([v])}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="选择设备" />
                                </SelectTrigger>
                                <SelectContent>
                                    {devices.map(device => (
                                        <SelectItem key={device.id} value={device.id}>
                                            {device.name || device.id}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedDevices[0] && (() => {
                            const device = devices.find(d => d.id === selectedDevices[0]);
                            const slots = device?.slots || [];
                            return slots.length > 0 && (
                                <div className="space-y-2">
                                    <Label>选择卡槽</Label>
                                    <Select 
                                        value={selectedSlots[selectedDevices[0]] || '1'} 
                                        onValueChange={(v) => handleSlotChange(selectedDevices[0], v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="默认卡槽" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">默认 (卡槽1)</SelectItem>
                                            {slots.map(slot => (
                                                <SelectItem key={slot.id} value={slot.slotNum.toString()}>
                                                    卡槽 {slot.slotNum} {slot.phoneNumber ? `(${slot.phoneNumber})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            );
                        })()}

                        <div className="space-y-2">
                            <Label htmlFor="phone">目标号码 *</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="输入手机号码（11位中国号码，如：13800138000）"
                                value={phoneNumbers}
                                onChange={(e) => setPhoneNumbers(e.target.value)}
                            />
                            {phoneNumbers && !isValidPhoneNumber(phoneNumbers.split(/[,\n]/)[0]?.trim() || '') && (
                                <p className="text-xs text-destructive">
                                    请输入正确的手机号码格式（11位中国号码，如：13800138000）
                                </p>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="batch" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>选择设备（可多选）</Label>
                            <div className="border border-border/50 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-muted/20">
                                {devices.map(device => {
                                    const slots = device.slots || [];
                                    return (
                                        <div key={device.id} className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    checked={selectedDevices.includes(device.id)}
                                                    onCheckedChange={() => toggleDevice(device.id)}
                                                />
                                                <Label className="font-medium">{device.name || device.id}</Label>
                                            </div>
                                            {selectedDevices.includes(device.id) && slots.length > 0 && (
                                                <div className="ml-6">
                                                    <Select 
                                                        value={selectedSlots[device.id] || '1'} 
                                                        onValueChange={(v) => handleSlotChange(device.id, v)}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="选择卡槽" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">默认 (卡槽1)</SelectItem>
                                                            {slots.map(slot => (
                                                                <SelectItem key={slot.id} value={slot.slotNum.toString()}>
                                                                    卡槽 {slot.slotNum} {slot.phoneNumber ? `(${slot.phoneNumber})` : ''}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                已选择 {selectedDevices.length} 个设备
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phones">目标号码（多个号码用逗号或换行分隔）*</Label>
                            <Textarea
                                id="phones"
                                placeholder="例如: 13800138000, 13900139000&#10;或每行一个号码（11位中国号码）"
                                value={phoneNumbers}
                                onChange={(e) => setPhoneNumbers(e.target.value)}
                                className="min-h-[100px]"
                            />
                            <p className="text-xs text-muted-foreground">
                                支持多卡发一个号（选择多个设备，一个号码）或一个卡发多个号（一个设备，多个号码）
                            </p>
                            {phoneNumbers && (() => {
                                const { invalid } = validatePhoneNumbers(phoneNumbers);
                                return invalid.length > 0 && (
                                    <p className="text-xs text-destructive">
                                        以下号码格式不正确：{invalid.join(', ')}
                                    </p>
                                );
                            })()}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="interval">发送间隔（秒）</Label>
                            <Input
                                id="interval"
                                type="number"
                                min="0"
                                value={intervalSeconds}
                                onChange={(e) => setIntervalSeconds(parseInt(e.target.value) || 0)}
                                placeholder="0表示立即发送，无间隔"
                            />
                            <p className="text-xs text-muted-foreground">
                                设置每条短信之间的发送间隔，避免被运营商限制（建议至少3秒）
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="scheduled" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>选择设备（可多选）</Label>
                            <div className="border border-border/50 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-muted/20">
                                {devices.map(device => {
                                    const slots = device.slots || [];
                                    return (
                                        <div key={device.id} className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    checked={selectedDevices.includes(device.id)}
                                                    onCheckedChange={() => toggleDevice(device.id)}
                                                />
                                                <Label className="font-medium">{device.name || device.id}</Label>
                                            </div>
                                            {selectedDevices.includes(device.id) && slots.length > 0 && (
                                                <div className="ml-6">
                                                    <Select 
                                                        value={selectedSlots[device.id] || '1'} 
                                                        onValueChange={(v) => handleSlotChange(device.id, v)}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="选择卡槽" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">默认 (卡槽1)</SelectItem>
                                                            {slots.map(slot => (
                                                                <SelectItem key={slot.id} value={slot.slotNum.toString()}>
                                                                    卡槽 {slot.slotNum} {slot.phoneNumber ? `(${slot.phoneNumber})` : ''}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phones-scheduled">目标号码（多个号码用逗号或换行分隔）*</Label>
                            <Textarea
                                id="phones-scheduled"
                                placeholder="例如: 13800138000, 13900139000（11位中国号码）"
                                value={phoneNumbers}
                                onChange={(e) => setPhoneNumbers(e.target.value)}
                                className="min-h-[100px]"
                            />
                            {phoneNumbers && (() => {
                                const { invalid } = validatePhoneNumbers(phoneNumbers);
                                return invalid.length > 0 && (
                                    <p className="text-xs text-destructive">
                                        以下号码格式不正确：{invalid.join(', ')}
                                    </p>
                                );
                            })()}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="scheduled-time">定时发送时间 *</Label>
                            <Input
                                id="scheduled-time"
                                type="datetime-local"
                                value={scheduledDateTime}
                                onChange={(e) => setScheduledDateTime(e.target.value)}
                                min={getMinDateTime()}
                            />
                            <p className="text-xs text-muted-foreground">
                                选择短信发送的具体时间
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="content">短信内容 *</Label>
                    <Textarea
                        id="content"
                        placeholder="输入短信内容..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[120px]"
                    />
                    <div className="text-xs text-muted-foreground text-right">
                        {content.length} 字符
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                        取消
                    </Button>
                    <Button onClick={handleSend} disabled={sending || !phoneNumbers || !content}>
                        {sending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                发送中...
                            </>
                        ) : (
                            <>
                                <Send className="mr-2 h-4 w-4" />
                                {sendMode === 'scheduled' ? '创建定时任务' : '发送'}
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
