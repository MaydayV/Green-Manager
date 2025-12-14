'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BatchResult {
    deviceId: string;
    deviceName?: string;
    success: boolean;
    error?: string;
    duration?: number;
}

interface BatchOperationProgressProps {
    batchId: string;
    total: number;
    onComplete?: (results: BatchResult[]) => void;
}

export function BatchOperationProgress({ batchId, total, onComplete }: BatchOperationProgressProps) {
    const [results, setResults] = useState<BatchResult[]>([]);
    const [status, setStatus] = useState<'running' | 'completed' | 'failed'>('running');
    const [open, setOpen] = useState(true);

    useEffect(() => {
        // 轮询获取批量操作进度
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/batch/${batchId}/status`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.results || []);
                    
                    if (data.status === 'completed' || data.status === 'failed') {
                        setStatus(data.status);
                        clearInterval(interval);
                        if (onComplete) {
                            onComplete(data.results || []);
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to fetch batch status:', e);
            }
        }, 1000); // 每秒轮询一次

        return () => clearInterval(interval);
    }, [batchId, onComplete]);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const progress = total > 0 ? (results.length / total) * 100 : 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>批量操作进度</DialogTitle>
                    <DialogDescription>
                        正在处理 {results.length} / {total} 台设备
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* 进度条 */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span>总体进度</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>

                    {/* 统计信息 */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">进行中</p>
                                        <p className="text-lg font-bold">{total - results.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center space-x-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">成功</p>
                                        <p className="text-lg font-bold text-green-500">{successCount}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center space-x-2">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">失败</p>
                                        <p className="text-lg font-bold text-red-500">{failCount}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 详细日志 */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">执行日志</h4>
                        <ScrollArea className="h-64 border rounded-lg p-3">
                            <div className="space-y-2">
                                {results.length === 0 ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        <span className="ml-2 text-sm text-muted-foreground">等待执行...</span>
                                    </div>
                                ) : (
                                    results.map((result, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-2 rounded border bg-muted/30"
                                        >
                                            <div className="flex items-center space-x-2 flex-1">
                                                {result.success ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                )}
                                                <span className="text-sm font-medium">
                                                    {result.deviceName || result.deviceId.slice(0, 8)}
                                                </span>
                                                {result.duration && (
                                                    <span className="text-xs text-muted-foreground">
                                                        ({result.duration}ms)
                                                    </span>
                                                )}
                                            </div>
                                            {result.error && (
                                                <Badge variant="destructive" className="text-xs">
                                                    {result.error}
                                                </Badge>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {status === 'completed' && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => setOpen(false)}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                            >
                                关闭
                            </button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

