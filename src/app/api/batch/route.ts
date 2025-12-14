import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import crypto from 'crypto';

const prisma = new PrismaClient();

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
        const { targetIds, command, params, batchName } = await request.json();

        if (!targetIds || !Array.isArray(targetIds) || targetIds.length === 0) {
            return NextResponse.json({ error: 'No targets specified' }, { status: 400 });
        }
        if (!command) {
            return NextResponse.json({ error: 'No command specified' }, { status: 400 });
        }

        const batchId = crypto.randomUUID();
        const devices = await prisma.device.findMany({
            where: { id: { in: targetIds } }
        });

        // Create Command Records
        const commands = devices.map(device => ({
            id: crypto.randomUUID(),
            deviceId: device.id,
            command: command,
            params: params ? JSON.stringify(params) : null,
            status: 'pending',
            batchId: batchId,
            batchName: batchName || `Batch ${command} - ${new Date().toLocaleString()}`,
            sentAt: new Date()
        }));

        await prisma.commandHistory.createMany({
            data: commands
        });

        // Trigger Execution in Background (Fire and forget loop)
        // Note: In Next.js / Vercel Serverless, this might not finish if the function terminates.
        // For self-hosted/long-running node, it's fine.
        // Ideally use a queue (Bull/Redis). For MVP, we iterate and await lightly or detach.

        (async () => {
            const token = getAdminToken();
            for (const cmdRec of commands) {
                const device = devices.find(d => d.id === cmdRec.deviceId);
                if (!device || !device.ip) {
                    await prisma.commandHistory.update({ where: { id: cmdRec.id }, data: { status: 'failed', result: 'Device Offline/No IP' } });
                    continue;
                }

                // Build URL
                let url = `http://${device.ip}/ctrl?token=${token}&cmd=${command}&tid=${cmdRec.id}`;

                // Append Params (p1..p7) if provided in generic params object { p1: 'val' }
                if (params) {
                    Object.entries(params).forEach(([k, v]) => {
                        if (k.startsWith('p')) {
                            url += `&${k}=${encodeURIComponent(String(v))}`;
                        }
                    });
                }

                console.log(`Executing batch cmd on ${device.id}: ${url}`);

                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 5000);
                    const res = await fetch(url, { signal: controller.signal });
                    clearTimeout(timeout);

                    if (res.ok) {
                        // Some commands return JSON { code: 0 } immediately.
                        await prisma.commandHistory.update({ where: { id: cmdRec.id }, data: { status: 'sent', result: 'Sent to device' } });
                    } else {
                        await prisma.commandHistory.update({ where: { id: cmdRec.id }, data: { status: 'failed', result: `HTTP ${res.status}` } });
                    }
                } catch (e: any) {
                    console.error(`Batch exec failed for ${device.id}`, e);
                    await prisma.commandHistory.update({ where: { id: cmdRec.id }, data: { status: 'failed', result: e.message } });
                }
            }
        })();

        return NextResponse.json({ success: true, batchId, count: commands.length });

    } catch (error) {
        console.error('Batch API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
