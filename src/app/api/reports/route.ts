import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'daily'; // daily, weekly, monthly
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const now = new Date();
        let start: Date;
        let end: Date = now;

        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
        } else {
            // Default to last 30 days
            start = new Date(now);
            start.setDate(now.getDate() - 30);
        }

        // Device statistics
        const totalDevices = await prisma.device.count();
        const onlineDevices = await prisma.device.count({ where: { status: 'online' } });
        const offlineDevices = totalDevices - onlineDevices;

        // SMS statistics
        const smsStats = await prisma.smsMessage.groupBy({
            by: ['direction'],
            where: {
                timestamp: { gte: start, lte: end }
            },
            _count: true
        });

        const smsSent = smsStats.find(s => s.direction === 'outgoing')?._count || 0;
        const smsReceived = smsStats.find(s => s.direction === 'incoming')?._count || 0;

        // Call statistics
        const callStats = await prisma.callRecord.groupBy({
            by: ['status'],
            where: {
                startTime: { gte: start, lte: end }
            },
            _count: true,
            _avg: {
                duration: true
            }
        });

        const answeredCalls = callStats.find(s => s.status === 'answered')?._count || 0;
        const missedCalls = callStats.find(s => s.status === 'missed')?._count || 0;
        const avgCallDuration = callStats.find(s => s.status === 'answered')?._avg.duration || 0;

        // SIM card statistics
        const simStats = await prisma.slot.groupBy({
            by: ['operator'],
            where: {
                simStatus: 'OK'
            },
            _count: true
        });

        // Cost estimation (rough estimates)
        const estimatedSmsCost = smsSent * 0.1; // 0.1元 per SMS
        const estimatedCallCost = answeredCalls * (avgCallDuration / 60) * 0.15; // 0.15元 per minute
        const estimatedDataCost = 0; // Would need actual data usage tracking

        // Device uptime statistics
        const deviceUptimes = await prisma.deviceStatus.findMany({
            where: {
                timestamp: { gte: start, lte: end },
                uptime: { not: null }
            },
            select: {
                deviceId: true,
                uptime: true,
                timestamp: true
            },
            orderBy: { timestamp: 'desc' }
        });

        const avgUptime = deviceUptimes.length > 0
            ? deviceUptimes.reduce((sum, d) => sum + (d.uptime || 0), 0) / deviceUptimes.length
            : 0;

        // 生成时间序列数据（按天）
        const timeSeries: Map<string, { date: string; sms: number; calls: number; devices: number }> = new Map();
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const interval = daysDiff <= 7 ? 'day' : daysDiff <= 30 ? 'day' : 'week';

        // 初始化时间序列
        for (let i = 0; i <= daysDiff; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            timeSeries.set(dateStr, { date: dateStr, sms: 0, calls: 0, devices: 0 });
        }

        // 获取按日期聚合的数据
        const allSms = await prisma.smsMessage.findMany({
            where: {
                timestamp: { gte: start, lte: end }
            },
            select: {
                timestamp: true
            }
        });

        const allCalls = await prisma.callRecord.findMany({
            where: {
                startTime: { gte: start, lte: end }
            },
            select: {
                startTime: true
            }
        });

        // 按日期聚合短信
        allSms.forEach(sms => {
            const dateStr = sms.timestamp.toISOString().split('T')[0];
            const entry = timeSeries.get(dateStr);
            if (entry) {
                entry.sms++;
            }
        });

        // 按日期聚合通话
        allCalls.forEach(call => {
            const dateStr = call.startTime.toISOString().split('T')[0];
            const entry = timeSeries.get(dateStr);
            if (entry) {
                entry.calls++;
            }
        });

        // 获取每日在线设备数（简化：使用当日最后状态）
        const deviceStatuses = await prisma.deviceStatus.findMany({
            where: {
                timestamp: { gte: start, lte: end }
            },
            select: {
                deviceId: true,
                timestamp: true
            },
            orderBy: { timestamp: 'desc' }
        });

        // 按日期统计唯一设备数
        const devicesByDate = new Map<string, Set<string>>();
        deviceStatuses.forEach(status => {
            const dateStr = status.timestamp.toISOString().split('T')[0];
            if (!devicesByDate.has(dateStr)) {
                devicesByDate.set(dateStr, new Set());
            }
            devicesByDate.get(dateStr)!.add(status.deviceId);
        });

        devicesByDate.forEach((deviceSet, dateStr) => {
            const entry = timeSeries.get(dateStr);
            if (entry) {
                entry.devices = deviceSet.size;
            }
        });

        const timeSeriesData = Array.from(timeSeries.values());

        return NextResponse.json({
            period: { start: start.toISOString(), end: end.toISOString(), type },
            devices: {
                total: totalDevices,
                online: onlineDevices,
                offline: offlineDevices,
                onlineRate: totalDevices > 0 ? (onlineDevices / totalDevices) * 100 : 0
            },
            sms: {
                sent: smsSent,
                received: smsReceived,
                total: smsSent + smsReceived
            },
            calls: {
                answered: answeredCalls,
                missed: missedCalls,
                total: answeredCalls + missedCalls,
                avgDuration: Math.round(avgCallDuration),
                answerRate: (answeredCalls + missedCalls) > 0 
                    ? (answeredCalls / (answeredCalls + missedCalls)) * 100 
                    : 0
            },
            simCards: {
                byOperator: simStats.map(s => ({
                    operator: s.operator || 'Unknown',
                    count: s._count
                }))
            },
            costs: {
                sms: estimatedSmsCost,
                calls: estimatedCallCost,
                data: estimatedDataCost,
                total: estimatedSmsCost + estimatedCallCost + estimatedDataCost
            },
            performance: {
                avgUptime: Math.round(avgUptime)
            },
            timeSeries: timeSeriesData
        });
    } catch (e: any) {
        console.error('Failed to generate report:', e);
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }
}
