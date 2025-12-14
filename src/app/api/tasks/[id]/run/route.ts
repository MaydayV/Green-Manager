import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import crypto from 'crypto';

const prisma = new PrismaClient();

function getAdminToken(admin: string = 'admin', pass: string = 'admin') {
    const str = `${admin}|${pass}`;
    return crypto.createHash('md5').update(str).digest('hex');
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const task = await prisma.scheduledTask.findUnique({
            where: { id },
            include: { device: true }
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Execute the task command
        if (task.deviceId && task.device?.ip) {
            const token = task.device.token || getAdminToken();
            const tid = crypto.randomUUID();
            let url = `http://${task.device.ip}/ctrl?token=${token}&cmd=${task.command}&tid=${tid}`;

            if (task.params) {
                try {
                    const paramsObj = JSON.parse(task.params);
                    Object.entries(paramsObj).forEach(([k, v]) => {
                        if (k.startsWith('p')) {
                            url += `&${k}=${encodeURIComponent(String(v))}`;
                        } else if (k === 'slot') {
                            url += `&p1=${encodeURIComponent(String(v))}`;
                        } else if (k === 'phone') {
                            url += `&p2=${encodeURIComponent(String(v))}`;
                        } else if (k === 'content') {
                            url += `&p3=${encodeURIComponent(String(v))}`;
                        }
                    });
                } catch (e) {
                    console.error('Failed to parse params:', e);
                }
            }

            // Fire and forget
            fetch(url).catch(err => console.error(`Task ${task.name} execution error`, err));

            // Update last run time
            await prisma.scheduledTask.update({
                where: { id },
                data: { lastRun: new Date() }
            });

            return NextResponse.json({ success: true, message: 'Task executed' });
        } else {
            // Global task or no device
            return NextResponse.json({ error: 'Task requires a device' }, { status: 400 });
        }
    } catch (error) {
        console.error('Task execution error:', error);
        return NextResponse.json({ error: 'Failed to execute task' }, { status: 500 });
    }
}

