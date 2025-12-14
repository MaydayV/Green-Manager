import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const groups = await prisma.deviceGroup.findMany({
            include: {
                devices: {
                    select: {
                        id: true,
                        name: true,
                        status: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(groups);
    } catch (e: any) {
        console.error('Failed to fetch groups:', e);
        return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { name, description, color } = await request.json();
        
        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const group = await prisma.deviceGroup.create({
            data: {
                name,
                description,
                color: color || '#3b82f6'
            }
        });

        return NextResponse.json(group);
    } catch (e: any) {
        console.error('Failed to create group:', e);
        return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }
}
