import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const templates = await prisma.smsTemplate.findMany({
            orderBy: [
                { useCount: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        return NextResponse.json(templates);
    } catch (e: any) {
        console.error('Failed to fetch SMS templates:', e);
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { name, content, variables, category } = await request.json();

        if (!name || !content) {
            return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
        }

        const template = await prisma.smsTemplate.create({
            data: {
                name,
                content,
                variables: variables ? JSON.stringify(variables) : null,
                category: category || 'notification'
            }
        });

        return NextResponse.json(template);
    } catch (e: any) {
        console.error('Failed to create SMS template:', e);
        return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }
}
