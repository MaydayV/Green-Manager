'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Loader2, Hash, Asterisk, Send } from 'lucide-react';
import { isValidPhoneNumber } from '@/lib/utils';

interface Device {
    id: string;
    name?: string;
    slots?: { id: string; slotNum: number; phoneNumber?: string }[];
}

interface PhoneDialerProps {
    trigger?: React.ReactNode;
}

export function PhoneDialer({ trigger }: PhoneDialerProps) {
    const [open, setOpen] = useState(false);
    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('__default__');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [ttsContent, setTtsContent] = useState('');
    const [dialing, setDialing] = useState(false);
    const [inCall, setInCall] = useState(false);
    const [keySequence, setKeySequence] = useState('');

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
                if (data.length > 0) {
                    setSelectedDevice(data[0].id);
                }
            }
        } catch (e) {
            console.error('Failed to fetch devices:', e);
        }
    };

    const handleDial = async () => {
        if (!selectedDevice) {
            alert('请选择设备');
            return;
        }

        if (!phoneNumber.trim()) {
            alert('请输入电话号码');
            return;
        }

        if (!isValidPhoneNumber(phoneNumber.trim())) {
            alert('电话号码格式不正确！\n\n请输入正确的手机号码（11位中国手机号，如：13800138000，或国际格式，如：+8613800138000）');
            return;
        }

        setDialing(true);
        try {
            const res = await fetch(`/api/devices/${selectedDevice}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: 'teldial',
                    slot: selectedSlot === '__default__' || !selectedSlot ? '1' : selectedSlot,
                    phone: phoneNumber,
                    ttsContent: ttsContent || undefined,
                    duration: 175, // Default 175 seconds
                    ttsRepeat: 2,
                    ttsPause: 1,
                    actionAfterTts: 1 // Hang up after TTS
                })
            });

            if (res.ok) {
                setInCall(true);
                alert('电话正在拨打中...');
            } else {
                const error = await res.text();
                alert(`拨打失败: ${error}`);
            }
        } catch (e) {
            alert('拨打失败，请重试');
            console.error(e);
        } finally {
            setDialing(false);
        }
    };

    const handleHangup = async () => {
        if (!selectedDevice) return;

        try {
            const res = await fetch(`/api/devices/${selectedDevice}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: 'telhangup',
                    slot: selectedSlot === '__default__' || !selectedSlot ? '1' : selectedSlot
                })
            });

            if (res.ok) {
                setInCall(false);
                alert('电话已挂断');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSendKey = async (key: string) => {
        if (!selectedDevice || !inCall) return;

        try {
            const res = await fetch(`/api/devices/${selectedDevice}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: 'telkeypress',
                    slot: selectedSlot === '__default__' || !selectedSlot ? '1' : selectedSlot,
                    keys: key,
                    keyDuration: 200,
                    keyInterval: 100
                })
            });

            if (res.ok) {
                setKeySequence(prev => prev + key);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSendKeySequence = async () => {
        if (!selectedDevice || !inCall || !keySequence) return;

        try {
            const res = await fetch(`/api/devices/${selectedDevice}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: 'telkeypress',
                    slot: selectedSlot === '__default__' || !selectedSlot ? '1' : selectedSlot,
                    keys: keySequence,
                    keyDuration: 200,
                    keyInterval: 100
                })
            });

            if (res.ok) {
                setKeySequence('');
                alert('按键序列已发送');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const appendToKeySequence = (key: string) => {
        setKeySequence(prev => prev + key);
    };

    const currentDevice = devices.find(d => d.id === selectedDevice);
    const slots = currentDevice?.slots || [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Phone className="mr-2 h-4 w-4" />
                        拨打电话
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>电话拨号</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>选择设备</Label>
                        <Select value={selectedDevice} onValueChange={setSelectedDevice}>
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

                    {slots.length > 0 && (
                        <div className="space-y-2">
                            <Label>选择卡槽</Label>
                            <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                                <SelectTrigger>
                                    <SelectValue placeholder="默认卡槽" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__default__">默认 (卡槽1)</SelectItem>
                                    {slots.map(slot => (
                                        <SelectItem key={slot.id} value={slot.slotNum.toString()}>
                                            卡槽 {slot.slotNum} {slot.phoneNumber ? `(${slot.phoneNumber})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="phone">电话号码 *</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="输入手机号码（11位中国号码，如：13800138000）"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                        {phoneNumber && !isValidPhoneNumber(phoneNumber.trim()) && (
                            <p className="text-xs text-destructive">
                                请输入正确的手机号码格式（11位中国号码，如：13800138000）
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tts">TTS语音内容（可选）</Label>
                        <Textarea
                            id="tts"
                            placeholder="电话接通后播放的语音内容..."
                            value={ttsContent}
                            onChange={(e) => setTtsContent(e.target.value)}
                            className="min-h-[80px]"
                        />
                    </div>

                    {!inCall ? (
                        <Button 
                            onClick={handleDial} 
                            disabled={dialing || !phoneNumber || !selectedDevice}
                            className="w-full"
                        >
                            {dialing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    拨打中...
                                </>
                            ) : (
                                <>
                                    <Phone className="mr-2 h-4 w-4" />
                                    拨打电话
                                </>
                            )}
                        </Button>
                    ) : (
                        <div className="space-y-4 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">通话中...</span>
                                <Button variant="destructive" onClick={handleHangup}>
                                    挂断
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label>按键拨号</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map(key => (
                                        <Button
                                            key={key}
                                            variant="outline"
                                            className="h-12 text-lg"
                                            onClick={() => handleSendKey(String(key))}
                                        >
                                            {key === '*' ? <Asterisk className="h-4 w-4" /> : 
                                             key === '#' ? <Hash className="h-4 w-4" /> : key}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>按键序列</Label>
                                <div className="flex space-x-2">
                                    <Input
                                        value={keySequence}
                                        onChange={(e) => setKeySequence(e.target.value)}
                                        placeholder="输入按键序列，如: 123#"
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={handleSendKeySequence}
                                        disabled={!keySequence}
                                        size="icon"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    支持暂停符: p(1秒), P(5秒), m(0.1秒), M(0.5秒)
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
