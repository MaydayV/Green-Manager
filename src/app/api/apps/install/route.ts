import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { appId, action } = await request.json(); // action = install | uninstall

        if (action === 'install') {
            await prisma.installedApp.create({
                data: { appId }
            });
        } else if (action === 'uninstall') {
            // Need to find installed record by appId (or pass installId)
            await prisma.installedApp.deleteMany({
                where: { appId }
            });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: 'Action failed' }, { status: 500 });
    }
}
