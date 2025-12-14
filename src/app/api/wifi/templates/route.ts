import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const templates = await prisma.wifiTemplate.findMany({
            include: {
                _count: {
                    select: { deviceConfigs: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(templates);
    } catch (e: any) {
        console.error('Failed to fetch WiFi templates:', e);
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { name, ssid, password, description } = await request.json();

        if (!name || !ssid || !password) {
            return NextResponse.json({ error: 'Name, SSID and password are required' }, { status: 400 });
        }

        const template = await prisma.wifiTemplate.create({
            data: {
                name,
                ssid,
                password,
                description
            }
        });

        return NextResponse.json(template);
    } catch (e: any) {
        console.error('Failed to create WiFi template:', e);
        return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }
}
