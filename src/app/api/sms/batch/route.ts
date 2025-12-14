import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import crypto from 'crypto';

const prisma = new PrismaClient();

function getAdminToken() {
    return crypto.createHash('md5').update('admin|admin').digest('hex');
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { 
            devices, // Array of { deviceId, slot }
            phones, // Array of phone numbers or single phone
            content,
            interval = 0, // Seconds between sends
            scheduledTime, // ISO datetime string for scheduled send
        } = body;

        if (!devices || !Array.isArray(devices) || devices.length === 0) {
            return NextResponse.json({ error: 'At least one device is required' }, { status: 400 });
        }

        if (!phones || (Array.isArray(phones) && phones.length === 0)) {
            return NextResponse.json({ error: 'At least one phone number is required' }, { status: 400 });
        }

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const phoneList = Array.isArray(phones) ? phones : [phones];
        const batchId = crypto.randomUUID();
        const messages: any[] = [];

        // Create all message records
        for (const deviceConfig of devices) {
            const { deviceId, slot = 1 } = deviceConfig;
            
            for (const phone of phoneList) {
                const tid = crypto.randomUUID();
                messages.push({
                    id: tid,
                    deviceId,
                    slotNum: parseInt(slot) || 1,
                    direction: 'outgoing',
                    phone: String(phone).trim(),
                    content,
                    status: scheduledTime ? 'scheduled' : 'pending',
                    timestamp: scheduledTime ? new Date(scheduledTime) : new Date(),
                });
            }
        }

        // Insert all messages
        await prisma.smsMessage.createMany({
            data: messages
        });

        // If scheduled, create a scheduled task
        if (scheduledTime) {
            const scheduleDate = new Date(scheduledTime);
            const now = new Date();
            const delayMinutes = Math.max(0, Math.floor((scheduleDate.getTime() - now.getTime()) / 60000));
            
            // Create a scheduled task for batch sending
            await prisma.scheduledTask.create({
                data: {
                    name: `批量短信发送 - ${batchId.slice(0, 8)}`,
                    schedule: `delay:${delayMinutes}`,
                    command: 'batch_sms',
                    params: JSON.stringify({
                        batchId,
                        messages: messages.map(m => ({
                            id: m.id,
                            deviceId: m.deviceId,
                            slot: m.slotNum,
                            phone: m.phone,
                            content: m.content
                        }))
                    }),
                    enabled: true
                }
            });
        } else {
            // Send immediately with interval
            await sendBatchWithInterval(messages, interval);
        }

        return NextResponse.json({ 
            success: true, 
            batchId,
            messageCount: messages.length,
            scheduled: !!scheduledTime
        });
    } catch (error: any) {
        console.error('Batch SMS error:', error);
        return NextResponse.json({ 
            error: 'Failed to send batch SMS', 
            details: error.message 
        }, { status: 500 });
    }
}

async function sendBatchWithInterval(messages: any[], intervalSeconds: number) {
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        
        if (i > 0 && intervalSeconds > 0) {
            // Wait for interval
            await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
        }

        try {
            const device = await prisma.device.findUnique({
                where: { id: msg.deviceId }
            });

            if (!device || !device.ip) {
                await prisma.smsMessage.update({
                    where: { id: msg.id },
                    data: { status: 'failed' }
                });
                continue;
            }

            const token = device.token || getAdminToken();
            const encodedContent = encodeURIComponent(msg.content);
            const url = `http://${device.ip}/ctrl?token=${token}&cmd=sendsms&tid=${msg.id}&p1=${msg.slotNum}&p2=${msg.phone}&p3=${encodedContent}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            try {
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (res.ok) {
                    await prisma.smsMessage.update({
                        where: { id: msg.id },
                        data: { status: 'sent' }
                    });
                } else {
                    throw new Error(`Device returned ${res.status}`);
                }
            } catch (fetchError: any) {
                await prisma.smsMessage.update({
                    where: { id: msg.id },
                    data: { status: 'failed' }
                });
            }
        } catch (error) {
            console.error(`Failed to send message ${msg.id}:`, error);
        }
    }
}
