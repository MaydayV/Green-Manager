import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function GET() {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);

        // 1. Device Stats
        const totalDevices = await prisma.device.count();
        const onlineDevices = await prisma.device.count({ where: { status: 'online' } });

        // 2. SMS Stats (Last 7 Days)
        const smsMessages = await prisma.smsMessage.findMany({
            where: {
                timestamp: { gte: sevenDaysAgo }
            },
            select: {
                direction: true,
                timestamp: true
            }
        });

        // 3. Call Stats (Last 7 Days)
        const calls = await prisma.callRecord.findMany({
            where: {
                startTime: { gte: sevenDaysAgo }
            },
            select: {
                startTime: true
            }
        });

        // Aggregation Logic
        const statsMap = new Map<string, { date: string, smsSent: number, smsReceived: number, calls: number }>();

        // Initialize last 7 days
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            statsMap.set(dateStr, { date: dateStr, smsSent: 0, smsReceived: 0, calls: 0 });
        }

        smsMessages.forEach(msg => {
            const dateStr = msg.timestamp.toISOString().split('T')[0];
            if (statsMap.has(dateStr)) {
                const entry = statsMap.get(dateStr)!;
                if (msg.direction === 'outgoing') entry.smsSent++;
                else entry.smsReceived++;
            }
        });

        calls.forEach(call => {
            const dateStr = call.startTime.toISOString().split('T')[0];
            if (statsMap.has(dateStr)) {
                const entry = statsMap.get(dateStr)!;
                entry.calls++;
            }
        });

        const chartData = Array.from(statsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        // Today's counts
        const todayStr = now.toISOString().split('T')[0];
        const todayStats = statsMap.get(todayStr) || { smsSent: 0, smsReceived: 0, calls: 0 };

        return NextResponse.json({
            devices: { total: totalDevices, online: onlineDevices },
            today: todayStats,
            history: chartData
        });

    } catch (error) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
