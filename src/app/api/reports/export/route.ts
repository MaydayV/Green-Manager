import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'devices'; // devices, sms, calls, audit
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const now = new Date();
        let start: Date;
        let end: Date = now;

        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
        } else {
            start = new Date(now);
            start.setDate(now.getDate() - 30);
        }

        let csv = '';
        let filename = '';

        switch (type) {
            case 'devices':
                filename = `devices_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv`;
                csv = await exportDevices(start, end);
                break;
            case 'sms':
                filename = `sms_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv`;
                csv = await exportSms(start, end);
                break;
            case 'calls':
                filename = `calls_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv`;
                csv = await exportCalls(start, end);
                break;
            case 'audit':
                filename = `audit_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv`;
                csv = await exportAudit(start, end);
                break;
            default:
                return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
        }

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });
    } catch (e: any) {
        console.error('Failed to export data:', e);
        return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
    }
}

async function exportDevices(start: Date, end: Date): Promise<string> {
    const devices = await prisma.device.findMany({
        include: {
            slots: true,
            group: true
        }
    });

    const headers = ['设备ID', '设备名称', 'IP地址', '状态', '分组', '标签', '最后在线', 'SIM卡数量'];
    const rows = devices.map(d => [
        d.id,
        d.name || '',
        d.ip || '',
        d.status,
        d.group?.name || '',
        d.tags ? JSON.parse(d.tags).join(',') : '',
        d.lastSeen ? d.lastSeen.toISOString() : '',
        d.slots.length.toString()
    ]);

    return [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
}

async function exportSms(start: Date, end: Date): Promise<string> {
    const messages = await prisma.smsMessage.findMany({
        where: {
            timestamp: { gte: start, lte: end }
        },
        include: {
            device: true
        },
        orderBy: { timestamp: 'desc' }
    });

    const headers = ['时间', '设备', '方向', '号码', '内容', '状态', '分类'];
    const rows = messages.map(m => [
        m.timestamp.toISOString(),
        m.device.name || m.deviceId,
        m.direction === 'incoming' ? '接收' : '发送',
        m.phone,
        `"${m.content.replace(/"/g, '""')}"`,
        m.status || '',
        m.category || ''
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

async function exportCalls(start: Date, end: Date): Promise<string> {
    const calls = await prisma.callRecord.findMany({
        where: {
            startTime: { gte: start, lte: end }
        },
        include: {
            device: true
        },
        orderBy: { startTime: 'desc' }
    });

    const headers = ['开始时间', '设备', '方向', '号码', '时长(秒)', '状态'];
    const rows = calls.map(c => [
        c.startTime.toISOString(),
        c.device.name || c.deviceId,
        c.direction === 'incoming' ? '呼入' : '呼出',
        c.phone,
        c.duration.toString(),
        c.status || ''
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

async function exportAudit(start: Date, end: Date): Promise<string> {
    const logs = await prisma.auditLog.findMany({
        where: {
            timestamp: { gte: start, lte: end }
        },
        orderBy: { timestamp: 'desc' }
    });

    const headers = ['时间', '用户ID', '操作', '目标', '详情'];
    const rows = logs.map(l => [
        l.timestamp.toISOString(),
        l.userId || '',
        l.action,
        l.target || '',
        l.details ? `"${l.details.replace(/"/g, '""')}"` : ''
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
