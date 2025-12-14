'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare, Send, Filter, Shield, CreditCard, ShoppingBag, Package, Search } from 'lucide-react';
import { SendSmsDialog } from '@/components/SendSmsDialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cachedFetch, cacheKeys, dataCache } from '@/lib/cache';
import { sseClient } from '@/lib/sse-client';
import { PageHeader } from '@/components/PageHeader';

interface Sms {
    id: string;
    deviceId: string;
    direction: string;
    phone: string;
    content: string;
    timestamp: string;
    status: string;
    category?: string;
    extractedData?: string;
}

export default function MessagesPage() {
    const [messages, setMessages] = useState<Sms[]>([]);
    const [filteredMessages, setFilteredMessages] = useState<Sms[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchMessages = useCallback(async () => {
        setLoading(true);
        try {
            const data = await cachedFetch<Sms[]>(
                '/api/sms',
                undefined,
                cacheKeys.sms(),
                1 * 60 * 1000 // 1分钟缓存
            );
            setMessages(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMessages();

        // 订阅SSE实时更新
        const unsubscribe = sseClient.on('sms:received', (event) => {
            // 新短信到达，添加到列表顶部
            setMessages(prev => [event.data, ...prev]);
            // 清除缓存
            dataCache.delete(cacheKeys.sms());
        });

        return () => {
            unsubscribe();
        };
    }, [fetchMessages]);

    useEffect(() => {
        let filtered = [...messages];

        // 分类过滤
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(msg => msg.category === categoryFilter);
        }

        // 搜索过滤
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(msg =>
                msg.phone.toLowerCase().includes(query) ||
                msg.content.toLowerCase().includes(query) ||
                msg.deviceId.toLowerCase().includes(query) ||
                (msg.extractedData && JSON.parse(msg.extractedData || '{}').verificationCode?.includes(query))
            );
        }

        // 按时间倒序
        filtered.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setFilteredMessages(filtered);
    }, [messages, categoryFilter, searchQuery]);

    const getCategoryIcon = (category?: string) => {
        switch (category) {
            case 'verification':
                return <Shield className="h-3 w-3" />;
            case 'bank':
                return <CreditCard className="h-3 w-3" />;
            case 'promotion':
                return <ShoppingBag className="h-3 w-3" />;
            case 'express':
                return <Package className="h-3 w-3" />;
            default:
                return <MessageSquare className="h-3 w-3" />;
        }
    };

    const getCategoryLabel = (category?: string) => {
        const labels: Record<string, string> = {
            verification: '验证码',
            bank: '银行',
            promotion: '营销',
            express: '快递',
            general: '普通'
        };
        return labels[category || 'general'] || '普通';
    };

    const getCategoryColor = (category?: string) => {
        const colors: Record<string, string> = {
            verification: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            bank: 'bg-green-500/10 text-green-500 border-green-500/20',
            promotion: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
            express: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
            general: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
        };
        return colors[category || 'general'] || colors.general;
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="短信列表"
                description="管理所有设备的短信收发记录"
                actions={
                    <>
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="搜索号码、内容、设备..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="全部类型" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全部类型</SelectItem>
                                <SelectItem value="verification">验证码</SelectItem>
                                <SelectItem value="bank">银行</SelectItem>
                                <SelectItem value="promotion">营销</SelectItem>
                                <SelectItem value="express">快递</SelectItem>
                                <SelectItem value="general">普通</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={fetchMessages} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <SendSmsDialog />
                    </>
                }
            />

            <div className="grid gap-3">
                {filteredMessages.map((msg) => {
                    const extracted = msg.extractedData ? JSON.parse(msg.extractedData) : null;
                    return (
                    <Card
                        key={msg.id}
                        className={`hover-lift transition-all border-l-4 ${msg.direction === 'incoming'
                                ? 'border-l-blue-500/60'
                                : 'border-l-green-500/60'
                            }`}
                    >
                        <CardHeader className="py-3 pb-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                    <div className={`h-2 w-2 rounded-full ${msg.direction === 'incoming' ? 'bg-blue-500' : 'bg-green-500'
                                        }`} />
                                    <span className="font-semibold text-sm">
                                        {msg.direction === 'incoming' ? '来自: ' : '发送至: '}
                                        <span className="font-mono">{msg.phone}</span>
                                    </span>
                                    {msg.category && (
                                        <Badge variant="outline" className={`text-xs ${getCategoryColor(msg.category)}`}>
                                            {getCategoryIcon(msg.category)}
                                            <span className="ml-1">{getCategoryLabel(msg.category)}</span>
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {new Date(msg.timestamp).toLocaleString('zh-CN', {
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="py-2 pb-3">
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                            {extracted && Object.keys(extracted).length > 0 && (
                                <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                                    <p className="font-medium mb-1">提取信息:</p>
                                    <div className="space-y-1">
                                        {extracted.verificationCode && (
                                            <span className="inline-block mr-2">验证码: <strong>{extracted.verificationCode}</strong></span>
                                        )}
                                        {extracted.balance !== undefined && (
                                            <span className="inline-block mr-2">余额: <strong>¥{extracted.balance}</strong></span>
                                        )}
                                        {extracted.trackingNumber && (
                                            <span className="inline-block mr-2">快递单号: <strong>{extracted.trackingNumber}</strong></span>
                                        )}
                                        {extracted.amount !== undefined && (
                                            <span className="inline-block mr-2">金额: <strong>¥{extracted.amount}</strong></span>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between mt-3 pt-2 border-t border-border/30 text-xs text-muted-foreground">
                                <span className="flex items-center">
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                    设备: <span className="font-mono ml-1">{msg.deviceId.substring(0, 8)}...</span>
                                </span>
                                <span className={`capitalize px-2 py-0.5 rounded-full ${msg.status === 'sent' ? 'bg-green-500/10 text-green-500' :
                                        msg.status === 'received' ? 'bg-blue-500/10 text-blue-500' :
                                            'bg-gray-500/10 text-gray-500'
                                    }`}>
                                    {msg.status}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                    );
                })}
                {filteredMessages.length === 0 && !loading && (
                    <div className="text-center py-16">
                        <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">暂无短信记录</p>
                        <p className="text-xs text-muted-foreground mt-1">点击右上角按钮发送第一条短信</p>
                    </div>
                )}
            </div>
        </div>
    );
}
