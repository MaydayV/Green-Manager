import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function GET(
    request: Request,
    { params }: { params: Promise<{ batchId: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { batchId } = await params;

        // 获取批量操作的所有命令记录
        const commands = await prisma.commandHistory.findMany({
            where: { batchId },
            include: {
                device: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { sentAt: 'asc' }
        });

        const results = commands.map(cmd => ({
            deviceId: cmd.deviceId,
            deviceName: cmd.device.name,
            success: cmd.status === 'success',
            error: cmd.status === 'failed' ? (cmd.result ? JSON.parse(cmd.result).msg || '执行失败' : '执行失败') : undefined,
            duration: cmd.executedAt && cmd.sentAt
                ? cmd.executedAt.getTime() - cmd.sentAt.getTime()
                : undefined
        }));

        // 判断批量操作是否完成
        const total = commands.length;
        const completed = commands.filter(c => c.status === 'success' || c.status === 'failed').length;
        const status = completed === total ? 'completed' : 'running';

        return NextResponse.json({
            batchId,
            status,
            total,
            completed,
            results
        });
    } catch (e: any) {
        console.error('Failed to fetch batch status:', e);
        return NextResponse.json({ error: 'Failed to fetch batch status' }, { status: 500 });
    }
}

