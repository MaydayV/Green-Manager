import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const { name, description, color, deviceIds } = await request.json();

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (color !== undefined) updateData.color = color;

        const group = await prisma.deviceGroup.update({
            where: { id },
            data: updateData
        });

        // Update device group assignments
        if (deviceIds !== undefined) {
            // Remove all devices from this group first
            await prisma.device.updateMany({
                where: { groupId: id },
                data: { groupId: null }
            });

            // Add selected devices to group
            if (deviceIds.length > 0) {
                await prisma.device.updateMany({
                    where: { id: { in: deviceIds } },
                    data: { groupId: id }
                });
            }
        }

        return NextResponse.json(group);
    } catch (e: any) {
        console.error('Failed to update group:', e);
        return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;

        // Remove all devices from this group
        await prisma.device.updateMany({
            where: { groupId: id },
            data: { groupId: null }
        });

        // Delete the group
        await prisma.deviceGroup.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Failed to delete group:', e);
        return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
    }
}
