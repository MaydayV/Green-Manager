import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { 
            name, deviceId, schedule, command, params: taskParams, enabled,
            taskType, triggerType, triggerConfig, actionConfig 
        } = body;
        
        // Build params object
        const paramsObj: any = {};
        if (taskParams) {
            try {
                const parsed = typeof taskParams === 'string' ? JSON.parse(taskParams) : taskParams;
                Object.assign(paramsObj, parsed);
            } catch (e) {
                // If params is not JSON, ignore
            }
        }
        
        // Add task type specific fields
        if (taskType) paramsObj.taskType = taskType;
        if (triggerType) paramsObj.triggerType = triggerType;
        if (triggerConfig) paramsObj.triggerConfig = triggerConfig;
        if (actionConfig) paramsObj.actionConfig = actionConfig;

        // Handle delay tasks
        const finalSchedule = taskType === 'delay' && schedule?.startsWith('delay:') 
            ? schedule 
            : (schedule || undefined);

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (deviceId !== undefined) updateData.deviceId = deviceId || null;
        if (finalSchedule !== undefined) updateData.schedule = finalSchedule;
        if (command !== undefined) updateData.command = command;
        if (enabled !== undefined) updateData.enabled = enabled;
        if (Object.keys(paramsObj).length > 0) {
            updateData.params = JSON.stringify(paramsObj);
        }

        const updated = await prisma.scheduledTask.update({
            where: { id },
            data: updateData
        });
        
        // Parse params for response
        const result: any = { ...updated };
        if (updated.params) {
            try {
                const parsed = JSON.parse(updated.params);
                result.taskType = parsed.taskType || 'cron';
                result.triggerType = parsed.triggerType;
                result.triggerConfig = parsed.triggerConfig;
                result.actionConfig = parsed.actionConfig;
            } catch (e) {
                result.taskType = 'cron';
            }
        } else {
            result.taskType = 'cron';
        }
        
        return NextResponse.json(result);
    } catch (e) {
        console.error('Update task error:', e);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await prisma.scheduledTask.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }
}
