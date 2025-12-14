import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const device = await prisma.device.findUnique({
            where: { id },
            include: {
                slots: true,
                statuses: {
                    orderBy: { timestamp: 'desc' },
                    take: 10
                },
                messages: {
                    orderBy: { timestamp: 'desc' },
                    take: 10
                },
                calls: {
                    orderBy: { startTime: 'desc' },
                    take: 10
                },
                alerts: {
                    where: { isResolved: false },
                    orderBy: { timestamp: 'desc' },
                    take: 5
                }
            }
        });
        if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        return NextResponse.json(device);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch device' }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, token, autoAnswer, ttsContent } = body;

        const updatedDevice = await prisma.device.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(token !== undefined && { token }),
                ...(autoAnswer !== undefined && { autoAnswer }),
                ...(ttsContent !== undefined && { ttsContent }),
            }
        });

        return NextResponse.json(updatedDevice);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update device' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Delete related records first
        await prisma.deviceStatus.deleteMany({ where: { deviceId: id } });
        await prisma.slot.deleteMany({ where: { deviceId: id } });
        await prisma.smsMessage.deleteMany({ where: { deviceId: id } });
        await prisma.callRecord.deleteMany({ where: { deviceId: id } });
        await prisma.commandHistory.deleteMany({ where: { deviceId: id } });
        await prisma.alert.deleteMany({ where: { deviceId: id } });
        await prisma.scheduledTask.deleteMany({ where: { deviceId: id } });

        await prisma.device.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete device:', error);
        return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 });
    }
}
