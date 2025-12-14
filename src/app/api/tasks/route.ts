import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const tasks = await prisma.scheduledTask.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                device: { select: { name: true } }
            }
        });
        
        // Parse taskType and other fields from params
        const tasksWithType = tasks.map(task => {
            const result: any = { ...task };
            if (task.params) {
                try {
                    const paramsObj = JSON.parse(task.params);
                    result.taskType = paramsObj.taskType || 'cron';
                    result.triggerType = paramsObj.triggerType;
                    result.triggerConfig = paramsObj.triggerConfig;
                    result.actionConfig = paramsObj.actionConfig;
                } catch (e) {
                    result.taskType = 'cron';
                }
            } else {
                result.taskType = 'cron';
            }
            return result;
        });
        
        return NextResponse.json(tasksWithType);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { name, deviceId, schedule, command, params, enabled, taskType, triggerType, triggerConfig, actionConfig } = body;

        if (!name || !command) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // For delay tasks, schedule is stored as "delay:minutes"
        const finalSchedule = taskType === 'delay' ? schedule : (schedule || '0 4 * * *');

        // Combine all config into params JSON
        const paramsObj: any = {};
        if (params) {
            try {
                const parsed = typeof params === 'string' ? JSON.parse(params) : params;
                Object.assign(paramsObj, parsed);
            } catch (e) {
                // If params is not JSON, store as is
            }
        }
        if (taskType) paramsObj.taskType = taskType;
        if (triggerType) paramsObj.triggerType = triggerType;
        if (triggerConfig) paramsObj.triggerConfig = triggerConfig;
        if (actionConfig) paramsObj.actionConfig = actionConfig;

        const task = await prisma.scheduledTask.create({
            data: {
                name,
                deviceId: deviceId || null,
                schedule: finalSchedule,
                command,
                params: Object.keys(paramsObj).length > 0 ? JSON.stringify(paramsObj) : null,
                enabled: enabled !== undefined ? enabled : true
            }
        });
        return NextResponse.json(task);
    } catch (e) {
        console.error('Create task error:', e);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}
