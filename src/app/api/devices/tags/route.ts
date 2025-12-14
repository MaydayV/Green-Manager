import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function PUT(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { deviceIds, tags } = await request.json();

        if (!deviceIds || !Array.isArray(deviceIds)) {
            return NextResponse.json({ error: 'deviceIds array is required' }, { status: 400 });
        }

        const tagsJson = JSON.stringify(tags || []);

        await prisma.device.updateMany({
            where: { id: { in: deviceIds } },
            data: { tags: tagsJson }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Failed to update device tags:', e);
        return NextResponse.json({ error: 'Failed to update tags' }, { status: 500 });
    }
}
