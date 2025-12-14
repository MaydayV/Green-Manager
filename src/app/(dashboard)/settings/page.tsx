'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, RefreshCw, Bell, Database, Key, Globe } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/PageHeader';

// 简单的分隔符组件
const Separator = () => <div className="h-px w-full bg-border my-4" />;

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // General Settings
    const [siteName, setSiteName] = useState('Green Manager');
    const [siteDescription, setSiteDescription] = useState('');
    
    // Notification Settings
    const [barkEnabled, setBarkEnabled] = useState(false);
    const [barkDeviceKey, setBarkDeviceKey] = useState('');
    const [barkBaseUrl, setBarkBaseUrl] = useState('https://api.day.app');
    
    // System Settings
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30);
    const [cacheEnabled, setCacheEnabled] = useState(true);
    const [cacheTTL, setCacheTTL] = useState(120);
    
    useEffect(() => {
        // Load settings from localStorage or API
        const loadSettings = async () => {
            try {
                // Load from localStorage (frontend only settings)
                const savedSiteName = localStorage.getItem('siteName');
                const savedBarkKey = localStorage.getItem('barkDeviceKey');
                const savedBarkUrl = localStorage.getItem('barkBaseUrl');
                
                if (savedSiteName) setSiteName(savedSiteName);
                if (savedBarkKey) setBarkDeviceKey(savedBarkKey);
                if (savedBarkUrl) setBarkBaseUrl(savedBarkUrl);
                
                // Load from API (server-side settings)
                // const res = await fetch('/api/settings');
                // if (res.ok) {
                //     const data = await res.json();
                //     // Update state with API data
                // }
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        };
        
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save to localStorage (frontend only)
            localStorage.setItem('siteName', siteName);
            localStorage.setItem('barkDeviceKey', barkDeviceKey);
            localStorage.setItem('barkBaseUrl', barkBaseUrl);
            
            // Save to API (server-side settings)
            // const res = await fetch('/api/settings', {
            //     method: 'PUT',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({
            //         siteName,
            //         barkEnabled,
            //         barkDeviceKey,
            //         barkBaseUrl,
            //         autoRefresh,
            //         refreshInterval,
            //         cacheEnabled,
            //         cacheTTL
            //     })
            // });
            
            alert('设置已保存');
        } catch (e) {
            console.error('Failed to save settings:', e);
            alert('保存设置失败，请重试');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="系统设置"
                description="管理系统配置和偏好设置"
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                        <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            保存中...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            保存设置
                        </>
                    )}
                </Button>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general">
                        <Settings className="h-4 w-4 mr-2" />
                        常规设置
                    </TabsTrigger>
                    <TabsTrigger value="notifications">
                        <Bell className="h-4 w-4 mr-2" />
                        通知设置
                    </TabsTrigger>
                    <TabsTrigger value="system">
                        <Database className="h-4 w-4 mr-2" />
                        系统设置
                    </TabsTrigger>
                    <TabsTrigger value="api">
                        <Key className="h-4 w-4 mr-2" />
                        API 设置
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>站点信息</CardTitle>
                            <CardDescription>配置系统显示名称和描述</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="siteName">站点名称</Label>
                                <Input
                                    id="siteName"
                                    value={siteName}
                                    onChange={(e) => setSiteName(e.target.value)}
                                    placeholder="站点名称"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="siteDescription">站点描述</Label>
                                <Textarea
                                    id="siteDescription"
                                    value={siteDescription}
                                    onChange={(e) => setSiteDescription(e.target.value)}
                                    placeholder="站点描述（可选）"
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bark 通知</CardTitle>
                            <CardDescription>配置 iOS Bark 推送通知服务</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="barkEnabled">启用 Bark 通知</Label>
                                    <p className="text-sm text-muted-foreground">
                                        启用后将通过 Bark 发送告警通知到 iOS 设备
                                    </p>
                                </div>
                                <Switch
                                    id="barkEnabled"
                                    checked={barkEnabled}
                                    onCheckedChange={setBarkEnabled}
                                />
                            </div>
                            {barkEnabled && (
                                <>
                                    <Separator />
                                    <div className="space-y-2">
                                        <Label htmlFor="barkDeviceKey">设备密钥 (Device Key)</Label>
                                        <Input
                                            id="barkDeviceKey"
                                            type="password"
                                            value={barkDeviceKey}
                                            onChange={(e) => setBarkDeviceKey(e.target.value)}
                                            placeholder="从 Bark 应用获取的设备密钥"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            在 Bark iOS 应用中查看并复制设备密钥
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="barkBaseUrl">Bark 服务器地址</Label>
                                        <Input
                                            id="barkBaseUrl"
                                            value={barkBaseUrl}
                                            onChange={(e) => setBarkBaseUrl(e.target.value)}
                                            placeholder="https://api.day.app"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            使用官方服务器或自建 Bark 服务器地址
                                        </p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="system" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>性能设置</CardTitle>
                            <CardDescription>配置系统性能相关参数</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="autoRefresh">自动刷新</Label>
                                    <p className="text-sm text-muted-foreground">
                                        自动刷新设备状态和数据
                                    </p>
                                </div>
                                <Switch
                                    id="autoRefresh"
                                    checked={autoRefresh}
                                    onCheckedChange={setAutoRefresh}
                                />
                            </div>
                            {autoRefresh && (
                                <div className="space-y-2">
                                    <Label htmlFor="refreshInterval">刷新间隔（秒）</Label>
                                    <Input
                                        id="refreshInterval"
                                        type="number"
                                        min="5"
                                        max="300"
                                        value={refreshInterval}
                                        onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 30)}
                                    />
                                </div>
                            )}
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="cacheEnabled">启用缓存</Label>
                                    <p className="text-sm text-muted-foreground">
                                        启用数据缓存以提升性能
                                    </p>
                                </div>
                                <Switch
                                    id="cacheEnabled"
                                    checked={cacheEnabled}
                                    onCheckedChange={setCacheEnabled}
                                />
                            </div>
                            {cacheEnabled && (
                                <div className="space-y-2">
                                    <Label htmlFor="cacheTTL">缓存过期时间（秒）</Label>
                                    <Input
                                        id="cacheTTL"
                                        type="number"
                                        min="10"
                                        max="600"
                                        value={cacheTTL}
                                        onChange={(e) => setCacheTTL(parseInt(e.target.value) || 120)}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="api" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>API 配置</CardTitle>
                            <CardDescription>配置 API 访问和密钥管理</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>API 端点</Label>
                                <div className="flex items-center space-x-2">
                                    <Input
                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1`}
                                        disabled
                                        className="font-mono"
                                    />
                                    <Button variant="outline" size="icon" asChild>
                                        <a href="/developer" target="_blank">
                                            <Globe className="h-4 w-4" />
                                        </a>
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    访问开放平台页面查看 API 文档和管理 API 密钥
                                </p>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>API 密钥管理</Label>
                                    <p className="text-sm text-muted-foreground">
                                        创建和管理 API 访问密钥
                                    </p>
                                </div>
                                <Button variant="outline" asChild>
                                    <a href="/developer">管理密钥</a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
