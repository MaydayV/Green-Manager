import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        await prisma.wifiTemplate.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Failed to delete WiFi template:', e);
        return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const { name, ssid, password, description } = await request.json();

        const template = await prisma.wifiTemplate.update({
            where: { id },
            data: {
                name,
                ssid,
                password,
                description
            }
        });

        return NextResponse.json(template);
    } catch (e: any) {
        console.error('Failed to update WiFi template:', e);
        return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }
}
