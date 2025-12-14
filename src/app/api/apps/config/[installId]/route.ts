import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function GET(
    request: Request,
    { params }: { params: Promise<{ installId: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { installId } = await params;
        const installedApp = await prisma.installedApp.findUnique({
            where: { id: installId }
        });

        if (!installedApp) {
            return NextResponse.json({ error: 'Installed app not found' }, { status: 404 });
        }

        return NextResponse.json({
            config: installedApp.config ? JSON.parse(installedApp.config) : {}
        });
    } catch (e: any) {
        console.error('Failed to fetch app config:', e);
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ installId: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { installId } = await params;
        const { config } = await request.json();

        await prisma.installedApp.update({
            where: { id: installId },
            data: {
                config: JSON.stringify(config)
            }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Failed to save app config:', e);
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
}
