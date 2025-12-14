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
        const calls = await prisma.callRecord.findMany({
            orderBy: { startTime: 'desc' },
            take: 100,
            include: {
                device: {
                    select: { name: true }
                }
            }
        });
        return NextResponse.json(calls);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
    }
}
