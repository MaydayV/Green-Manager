import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        // 1. Auth Check (API Key)
        const apiKey = request.headers.get('X-API-Key');
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing API Key' }, { status: 401 });
        }

        const validKey = await prisma.apiKey.findUnique({
            where: { key: apiKey }
        });

        if (!validKey || !validKey.isEnabled) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
        }

        // Update last used
        await prisma.apiKey.update({
            where: { id: validKey.id },
            data: { lastUsed: new Date() }
        });

        // 2. Limit Check (Optional - MVP skip)

        // 3. Process Request
        const body = await request.json();
        const { phone, content } = body;

        if (!phone || !content) {
            return NextResponse.json({ error: 'Missing phone or content' }, { status: 400 });
        }

        // 4. Find available device (Simple round-robin or first active)
        const device = await prisma.device.findFirst({
            where: { status: 'online' }
        });

        if (!device) {
            return NextResponse.json({ error: 'No active devices to send SMS' }, { status: 503 });
        }

        // 5. Create SMS Record (which triggers queue/sending logic in real app, here we just insert pending)
        // In our architecture, the `sending` logic is usually handled by the UI calling the device directly or an agent.
        // But for an API, we need the server to dispatch it.
        // We will repurpose the /api/sms/send logic here but server-side.

        // For MVP, we insert a pending message and return Success. 
        // A background worker (or similar) would be needed to actually dispatch. 
        // OR we can make a direct HTTP call to the device here if we trust the loop.

        // Let's create a pending SMS to be consistent with DB.
        const msg = await prisma.smsMessage.create({
            data: {
                deviceId: device.id,
                slotNum: 1, // Default slot 1
                direction: 'outgoing',
                phone: phone,
                content: content,
                status: 'pending'
            }
        });

        // Asynchronously try to send to device (Fire and forget)
        // Note: In Next.js serverless this might be cut off, but for MVP local dev it's okay.
        fetch(`http://${device.ip}/send?phone=${phone}&msg=${encodeURIComponent(content)}`)
            .then(() => prisma.smsMessage.update({ where: { id: msg.id }, data: { status: 'sent' } }))
            .catch(() => prisma.smsMessage.update({ where: { id: msg.id }, data: { status: 'failed' } }));


        return NextResponse.json({ success: true, messageId: msg.id });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
