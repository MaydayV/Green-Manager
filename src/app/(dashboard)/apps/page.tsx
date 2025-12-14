'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Trash2, Settings, Box, Bot, FileSpreadsheet, Activity, MessageCircle } from 'lucide-react';
import { AppConfigDialog } from '@/components/AppConfigDialog';
import { PageHeader } from '@/components/PageHeader';

// Dynamic icon mapping
const IconMap: any = {
    'message-circle': MessageCircle,
    'file-spreadsheet': FileSpreadsheet,
    'bot': Bot,
    'activity': Activity,
    'box': Box
};

interface App {
    id: string;
    name: string;
    description: string;
    version: string;
    icon: string;
    category: string;
    isInstalled: boolean;
    installId?: string;
}

export default function AppsPage() {
    const [apps, setApps] = useState<App[]>([]);
    const [loading, setLoading] = useState(true);
    const [configDialogOpen, setConfigDialogOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState<App | null>(null);

    const fetchApps = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/apps');
            if (res.ok) {
                const data = await res.json();
                setApps(data || []);
            } else {
                console.error('Failed to fetch apps:', res.status);
            }
        } catch (e) {
            console.error('Error fetching apps:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApps();
    }, []);

    const handleAction = async (app: App, action: 'install' | 'uninstall') => {
        setLoading(true);
        try {
            const res = await fetch('/api/apps/install', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appId: app.id, action })
            });
            if (res.ok) {
                await fetchApps();
            } else {
                alert(`${action === 'install' ? '安装' : '卸载'}失败`);
            }
        } catch (e) {
            console.error('Action error:', e);
            alert(`${action === 'install' ? '安装' : '卸载'}失败，请重试`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="应用中心"
                description="安装插件以扩展功能"
                actions={
                    <Button variant="outline" size="icon" onClick={fetchApps}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                }
            />

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">加载中...</span>
                </div>
            ) : apps.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-16">
                        <Box className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">暂无应用</p>
                        <p className="text-xs text-muted-foreground mt-1">应用列表为空，请检查数据库或联系管理员</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {apps.map(app => {
                        const Icon = IconMap[app.icon] || Box;
                        return (
                            <Card key={app.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <Icon className="h-8 w-8 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{app.name}</CardTitle>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <Badge variant="secondary" className="text-xs">{app.category}</Badge>
                                                    <span className="text-xs text-muted-foreground">v{app.version}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <CardDescription className="text-sm">
                                        {app.description}
                                    </CardDescription>
                                </CardContent>
                                <CardFooter className="flex justify-between border-t border-border/30 bg-muted/20 p-4">
                                    {app.isInstalled ? (
                                        <>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedApp(app);
                                                    setConfigDialogOpen(true);
                                                }}
                                            >
                                                <Settings className="h-4 w-4 mr-2" /> 配置
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleAction(app, 'uninstall')}>
                                                <Trash2 className="h-4 w-4 mr-2" /> 卸载
                                            </Button>
                                        </>
                                    ) : (
                                        <Button className="w-full" onClick={() => handleAction(app, 'install')}>
                                            <Download className="h-4 w-4 mr-2" /> 安装
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
            
            <AppConfigDialog 
                open={configDialogOpen} 
                onOpenChange={setConfigDialogOpen}
                app={selectedApp}
            />
        </div>
    );
}
