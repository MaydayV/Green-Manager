import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import parser from 'cron-parser';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Helper to calculate admin token - reuse this logic or export it
function getAdminToken(admin: string = 'admin', pass: string = 'admin') {
    const str = `${admin}|${pass}`;
    return crypto.createHash('md5').update(str).digest('hex');
}

export async function GET() {
    // This endpoint should be protected or use a secret key for external triggers
    // For MVP we allow it open or check session used by browser for testing.
    // Ideally check headers for a CRON_SECRET.

    try {
        const tasks = await prisma.scheduledTask.findMany({
            where: { enabled: true }
        });

        const now = new Date();
        const executedIds = [];

        for (const task of tasks) {
            try {
                // Check if task is due
                // const interval = parseExpression(task.schedule, {
                //    currentDate: task.lastRun || new Date(0)
                // });

                // "Is Current Time Matching Cron?"
                // Cron patterns match specific minutes.
                // We can use parser.parseExpression(cron).events()?

                // Simpler check:
                // If we run this endpoint EVERY MINUTE via an external cron job:
                // We check if `now` matches the cron expression.

                // However, constructing a matcher is tricky.
                // Alternative: Use `interval.next()` relative to `now - 1 minute`.
                // If `next` <= `now`, then it's due.

                // Robust logic:
                // 1. Get lastRun.
                // 2. parser.parseExpression(schedule, { currentDate: lastRun }).next().toDate()
                // 3. If next_run_time <= now, then EXECUTE.

                // Handle delay tasks
                if (task.schedule.startsWith('delay:')) {
                    const delayMinutes = parseInt(task.schedule.replace('delay:', '')) || 0;
                    const createdAt = task.createdAt || new Date(now.getTime() - 600000);
                    const scheduledTime = new Date(createdAt.getTime() + delayMinutes * 60000);
                    
                    if (scheduledTime <= now && (!task.lastRun || task.lastRun < scheduledTime)) {
                        // Execute delay task
                    } else {
                        continue;
                    }
                } else {
                    // Cron task
                    const lastRunFn = task.lastRun ? new Date(task.lastRun) : new Date(now.getTime() - 600000);

                    // Prevent double execution in same minute if run frequently
                    if (task.lastRun && (now.getTime() - task.lastRun.getTime()) < 60000) {
                        continue;
                    }

                    const p = (parser as any).parseExpression(task.schedule, { currentDate: lastRunFn });
                    const nextRun = p.next().toDate();

                    if (nextRun > now) {
                        continue;
                    }
                }

                // Task is due - execute it
                {
                    // DUE! Execute.
                    console.log(`Executing Task ${task.name} (${task.id})`);
                    executedIds.push(task.id);

                    // 1. Update LastRun immediately to block re-entry
                    await prisma.scheduledTask.update({
                        where: { id: task.id },
                        data: { lastRun: now }
                    });

                    // 2. Execute Command
                    if (task.command === 'batch_sms' && task.params) {
                        // Handle batch SMS
                        try {
                            const paramsObj = JSON.parse(task.params);
                            const messages = paramsObj.messages || [];
                            
                            for (const msg of messages) {
                                const device = await prisma.device.findUnique({ where: { id: msg.deviceId } });
                                if (device && device.ip) {
                                    const token = device.token || getAdminToken();
                                    const encodedContent = encodeURIComponent(msg.content);
                                    const url = `http://${device.ip}/ctrl?token=${token}&cmd=sendsms&tid=${msg.id}&p1=${msg.slot}&p2=${msg.phone}&p3=${encodedContent}`;
                                    
                                    fetch(url).catch(err => console.error(`Batch SMS error for ${msg.id}`, err));
                                    
                                    // Update message status
                                    await prisma.smsMessage.update({
                                        where: { id: msg.id },
                                        data: { status: 'sent' }
                                    }).catch(() => {});
                                }
                            }
                        } catch (e) {
                            console.error('Batch SMS execution error:', e);
                        }
                    } else if (task.deviceId) {
                        // Specific Device Command
                        const device = await prisma.device.findUnique({ where: { id: task.deviceId } });
                        if (device && device.ip) {
                            const token = device.token || getAdminToken();
                            const tid = crypto.randomUUID();
                            let url = `http://${device.ip}/ctrl?token=${token}&cmd=${task.command}&tid=${tid}`;

                            if (task.params) {
                                try {
                                    const paramsObj = JSON.parse(task.params);
                                    Object.entries(paramsObj).forEach(([k, v]) => {
                                        if (k.startsWith('p')) url += `&${k}=${encodeURIComponent(String(v))}`;
                                        else if (k === 'slot') url += `&p1=${encodeURIComponent(String(v))}`;
                                        else if (k === 'phone') url += `&p2=${encodeURIComponent(String(v))}`;
                                        else if (k === 'content') url += `&p3=${encodeURIComponent(String(v))}`;
                                    });
                                } catch (e) { }
                            }

                            // Fire and forget fetch
                            fetch(url).catch(err => console.error(`Task ${task.name} fetch error`, err));

                            // Log History
                            await prisma.commandHistory.create({
                                data: {
                                    deviceId: device.id,
                                    command: task.command,
                                    params: task.params,
                                    status: 'sent',
                                    batchName: `Task: ${task.name}`
                                }
                            });
                        }
                    } else {
                        // Global Task? (Not implemented)
                    }
                }

            } catch (err) {
                console.error(`Error processing task ${task.id}`, err);
            }
        }

        return NextResponse.json({ success: true, executed: executedIds });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
    }
}
