'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Key, Copy, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from '@/components/PageHeader';

interface ApiKey {
    id: string;
    key: string;
    name: string;
    lastUsed: string;
    createdAt: string;
}

export default function DeveloperPage() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [newKeyName, setNewKeyName] = useState('');

    const fetchKeys = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/keys');
            if (res.ok) setKeys(await res.json());
        } catch (e) { }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleCreate = async () => {
        if (!newKeyName) return;
        await fetch('/api/keys', {
            method: 'POST',
            body: JSON.stringify({ name: newKeyName })
        });
        setNewKeyName('');
        fetchKeys();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Revoke this key?')) return;
        await fetch(`/api/keys?id=${id}`, { method: 'DELETE' });
        fetchKeys();
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="开放平台"
                description="管理 API 密钥并查看接口文档"
            />

            <Tabs defaultValue="keys">
                <TabsList>
                    <TabsTrigger value="keys">API 密钥</TabsTrigger>
                    <TabsTrigger value="docs">开发文档</TabsTrigger>
                </TabsList>

                <TabsContent value="keys" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>创建新密钥</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex space-x-2">
                                <Input placeholder="密钥名称 (例如: 我的业务系统)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
                                <Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" /> 生成</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4">
                        {keys.map(key => (
                            <Card key={key.id}>
                                <CardContent className="flex items-center justify-between p-6">
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <Key className="h-4 w-4 text-primary" />
                                            <span className="font-mono font-semibold text-lg">{key.key}</span>
                                            <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(key.key)}>
                                                <Copy className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {key.name} • 创建于: {new Date(key.createdAt).toLocaleDateString()} • 上次使用: {key.lastUsed ? new Date(key.lastUsed).toLocaleString() : '从未使用'}
                                        </div>
                                    </div>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(key.id)}>
                                        <Trash2 className="h-4 w-4 mr-2" /> 撤销
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                        {keys.length === 0 && !loading && <div className="text-muted-foreground text-center py-8">暂无 API 密钥。</div>}
                    </div>
                </TabsContent>

                <TabsContent value="docs">
                    <Card>
                        <CardHeader>
                            <CardTitle>API 参考文档</CardTitle>
                            <CardDescription>Base URL: <code>{typeof window !== 'undefined' ? window.location.origin : ''}/api/v1</code></CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <h3 className="font-semibold text-lg">发送短信</h3>
                                <div className="rounded-md bg-muted p-4 space-y-2">
                                    <div className="flex gap-2">
                                        <span className="bg-green-500 text-white px-2 rounded text-xs py-1">POST</span>
                                        <code className="text-sm">/sms/send</code>
                                    </div>
                                    <p className="text-sm text-muted-foreground">通过可用设备发送短信。</p>

                                    <h4 className="text-xs font-bold uppercase mt-4">Headers</h4>
                                    <pre className="text-xs bg-black/80 text-white p-2 rounded">
                                        X-API-Key: YOUR_API_KEY{'\n'}
                                        Content-Type: application/json
                                    </pre>

                                    <h4 className="text-xs font-bold uppercase mt-4">Body</h4>
                                    <pre className="text-xs bg-black/80 text-white p-2 rounded">
                                        {`{
  "phone": "+1234567890",
  "content": "Hello via API"
}`}
                                    </pre>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-semibold text-lg">请求示例</h3>
                                <pre className="text-xs bg-black/80 text-white p-4 rounded overflow-auto">
                                    {`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/sms/send \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"phone": "13800000000", "content": "Test Message"}'`}
                                </pre>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
