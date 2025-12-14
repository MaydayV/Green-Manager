'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Plus, Loader2 } from 'lucide-react';

export function AddDeviceDialog() {
    const [open, setOpen] = useState(false);
    const [ip, setIp] = useState('');
    const [token, setToken] = useState('');
    const [name, setName] = useState('');
    const [adding, setAdding] = useState(false);

    const handleAdd = async () => {
        if (!ip || !token) {
            alert('请填写设备IP和Token');
            return;
        }

        setAdding(true);
        try {
            const res = await fetch('/api/devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ip,
                    token,
                    name: name || undefined
                })
            });

            if (res.ok) {
                alert('设备添加成功！');
                setIp('');
                setToken('');
                setName('');
                setOpen(false);
                window.location.reload(); // Refresh the page to show new device
            } else {
                const error = await res.text();
                alert(`添加失败: ${error}`);
            }
        } catch (e) {
            alert('添加失败，请重试');
            console.error(e);
        } finally {
            setAdding(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    添加设备
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>手动添加设备</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="ip">设备IP地址 *</Label>
                        <Input
                            id="ip"
                            type="text"
                            placeholder="例如: 192.168.1.100"
                            value={ip}
                            onChange={(e) => setIp(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="token">设备Token *</Label>
                        <Input
                            id="token"
                            type="text"
                            placeholder="输入设备Token"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">设备名称 (可选)</Label>
                        <Input
                            id="name"
                            type="text"
                            placeholder="例如: 办公室设备"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={adding}>
                        取消
                    </Button>
                    <Button onClick={handleAdd} disabled={adding || !ip || !token}>
                        {adding ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                添加中...
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2 h-4 w-4" />
                                添加
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
