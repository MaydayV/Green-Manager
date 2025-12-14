import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import crypto from 'crypto';
import { logAuditEvent } from '@/app/api/audit/route';

const prisma = new PrismaClient();

// Helper to generate admin token (admin|password -> md5)
function getAdminToken(admin: string = 'admin', pass: string = 'admin') {
    const str = `${admin}|${pass}`;
    return crypto.createHash('md5').update(str).digest('hex');
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { deviceId, slot, phone, content } = await request.json();

        if (!deviceId || !phone || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const device = await prisma.device.findUnique({
            where: { id: deviceId },
        });

        if (!device || !device.ip) {
            return NextResponse.json({ error: 'Device not found or offline (no IP)' }, { status: 404 });
        }

        const tid = crypto.randomUUID(); // Use UUID as TID for tracking

        // 1. Record Outgoing Message (Pending)
        const sms = await prisma.smsMessage.create({
            data: {
                id: tid, // Use same ID so we can match 502 callback easily
                deviceId: deviceId,
                slotNum: parseInt(slot) || 1,
                direction: 'outgoing',
                phone: phone,
                content: content,
                status: 'pending',
                timestamp: new Date(),
            }
        });

        // 2. Record Command
        await prisma.commandHistory.create({
            data: {
                id: tid,
                deviceId: deviceId,
                command: 'sendsms',
                params: JSON.stringify({ slot, phone, content }),
                status: 'sent',
            }
        });

        // Log to audit
        await logAuditEvent(
            session.user?.id || null,
            'sms_send',
            deviceId,
            { slot, phone, contentLength: content.length }
        );

        // 3. Send to Device
        const token = getAdminToken(); // In real app, fetch from env or device settings
        const encodedContent = encodeURIComponent(content);
        const url = `http://${device.ip}/ctrl?token=${token}&cmd=sendsms&tid=${tid}&p1=${slot}&p2=${phone}&p3=${encodedContent}`;

        console.log(`Sending SMS to ${device.ip}: ${url}`);

        // Set a timeout for the fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
                // Note: Device returns JSON { code: 0 } on command receipt, 
                // actual delivery confirmation comes later via Callback 502.
                // So we keep status as 'pending' or move to 'sent_to_device'.
                // We'll leave it as 'pending' until 502 confirms (or update to 'sent' here and 'delivered' on 502?)
                // Let's assume 'sent' means "Sent to device".
                await prisma.smsMessage.update({
                    where: { id: tid },
                    data: { status: 'sent' } // Sent to device
                });
            } else {
                throw new Error(`Device returned ${res.status}`);
            }
        } catch (fetchError: any) {
            console.error('Failed to send to device:', fetchError);
            await prisma.smsMessage.update({
                where: { id: tid },
                data: { status: 'failed' }
            });
            await prisma.commandHistory.update({
                where: { id: tid },
                data: { status: 'failed', result: fetchError.message }
            });
            return NextResponse.json({ error: 'Failed to contact device', details: fetchError.message }, { status: 502 });
        }

        return NextResponse.json({ success: true, tid });

    } catch (error) {
        console.error('Send SMS error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
