import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const keys = await prisma.apiKey.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(keys);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { name } = await request.json();
        const key = await prisma.apiKey.create({
            data: { name }
        });
        return NextResponse.json(key);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to create key' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (id) {
            await prisma.apiKey.delete({ where: { id } });
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 });
    }
}
