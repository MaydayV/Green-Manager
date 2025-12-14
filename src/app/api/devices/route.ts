import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import crypto from 'crypto';

const prisma = new PrismaClient();

export function getAdminToken() {
    // Default admin token: MD5('admin|admin')
    return crypto.createHash('md5').update('admin|admin').digest('hex');
}

export async function GET() {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const devices = await prisma.device.findMany({
            orderBy: { lastSeen: 'desc' },
            include: {
                statuses: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                },
                slots: {
                    orderBy: { slotNum: 'asc' }
                },
                group: {
                    select: {
                        id: true,
                        name: true,
                        color: true
                    }
                }
            },
        });
        return NextResponse.json(devices);
    } catch (error) {
        console.error('Failed to fetch devices:', error);
        return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { ip, token, name, devId } = body;

        if (!ip || !token) {
            return NextResponse.json({ error: 'IP and token are required' }, { status: 400 });
        }

        // Try to get device status to verify connection
        const testUrl = `http://${ip}/ctrl?token=${token}&cmd=stat`;
        let deviceId = devId;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(testUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                deviceId = data.devId || deviceId || crypto.randomUUID();
                
                // Parse and save slot information from stat response
                if (data.slot) {
                    const slot = data.slot;
                    
                    // Process slot1
                    if (slot.slot1_sta && slot.slot1_sta !== 'ERR') {
                        await prisma.slot.upsert({
                            where: {
                                deviceId_slotNum: {
                                    deviceId: deviceId,
                                    slotNum: 1
                                }
                            },
                            update: {
                                operator: slot.sim1_op || slot.sim1op,
                                simStatus: slot.sim1_sta || slot.sim1sta,
                                signalStrength: slot.sim1_dbm || slot.sim1dbm ? parseInt(String(slot.sim1_dbm || slot.sim1dbm)) : undefined,
                                iccid: slot.sim1_iccId || slot.sim1iccId || slot.sim1_iccid || slot.sim1iccid,
                                imsi: slot.sim1_imsi || slot.sim1imsi,
                                phoneNumber: slot.sim1_msIsdn || slot.sim1msIsdn || slot.sim1_msisdn || slot.sim1msisdn,
                                updatedAt: new Date()
                            },
                            create: {
                                id: crypto.randomUUID(),
                                deviceId: deviceId,
                                slotNum: 1,
                                operator: slot.sim1_op || slot.sim1op,
                                simStatus: slot.sim1_sta || slot.sim1sta,
                                signalStrength: slot.sim1_dbm || slot.sim1dbm ? parseInt(String(slot.sim1_dbm || slot.sim1dbm)) : undefined,
                                iccid: slot.sim1_iccId || slot.sim1iccId || slot.sim1_iccid || slot.sim1iccid,
                                imsi: slot.sim1_imsi || slot.sim1imsi,
                                phoneNumber: slot.sim1_msIsdn || slot.sim1msIsdn || slot.sim1_msisdn || slot.sim1msisdn
                            }
                        });
                    }
                    
                    // Process slot2
                    if (slot.slot2_sta && slot.slot2_sta !== 'ERR') {
                        await prisma.slot.upsert({
                            where: {
                                deviceId_slotNum: {
                                    deviceId: deviceId,
                                    slotNum: 2
                                }
                            },
                            update: {
                                operator: slot.sim2_op || slot.sim2op,
                                simStatus: slot.sim2_sta || slot.sim2sta,
                                signalStrength: slot.sim2_dbm || slot.sim2dbm ? parseInt(String(slot.sim2_dbm || slot.sim2dbm)) : undefined,
                                iccid: slot.sim2_iccId || slot.sim2iccId || slot.sim2_iccid || slot.sim2iccid,
                                imsi: slot.sim2_imsi || slot.sim2imsi,
                                phoneNumber: slot.sim2_msIsdn || slot.sim2msIsdn || slot.sim2_msisdn || slot.sim2msisdn,
                                updatedAt: new Date()
                            },
                            create: {
                                id: crypto.randomUUID(),
                                deviceId: deviceId,
                                slotNum: 2,
                                operator: slot.sim2_op || slot.sim2op,
                                simStatus: slot.sim2_sta || slot.sim2sta,
                                signalStrength: slot.sim2_dbm || slot.sim2dbm ? parseInt(String(slot.sim2_dbm || slot.sim2dbm)) : undefined,
                                iccid: slot.sim2_iccId || slot.sim2iccId || slot.sim2_iccid || slot.sim2iccid,
                                imsi: slot.sim2_imsi || slot.sim2imsi,
                                phoneNumber: slot.sim2_msIsdn || slot.sim2msIsdn || slot.sim2_msisdn || slot.sim2msisdn
                            }
                        });
                    }
                }
            } else {
                // Still allow adding if we can't verify, but warn
                console.warn(`Device at ${ip} returned status ${res.status}`);
                if (!deviceId) {
                    deviceId = crypto.randomUUID();
                }
            }
        } catch (fetchError: any) {
            // If device is offline, we can still add it with a generated ID
            if (!deviceId) {
                deviceId = crypto.randomUUID();
            }
            console.warn(`Could not verify device at ${ip}:`, fetchError.message);
        }

        // Check if device already exists
        const existing = await prisma.device.findUnique({
            where: { id: deviceId }
        });

        if (existing) {
            // Update existing device
            const updated = await prisma.device.update({
                where: { id: deviceId },
                data: {
                    ip,
                    token,
                    name: name || existing.name,
                    status: 'online',
                    lastSeen: new Date()
                }
            });
            return NextResponse.json(updated);
        } else {
            // Create new device
            const device = await prisma.device.create({
                data: {
                    id: deviceId,
                    ip,
                    token,
                    name: name || `设备-${deviceId.slice(0, 8)}`,
                    status: 'online',
                    lastSeen: new Date()
                }
            });
            return NextResponse.json(device);
        }
    } catch (error: any) {
        console.error('Failed to add device:', error);
        return NextResponse.json({ 
            error: 'Failed to add device', 
            details: error.message 
        }, { status: 500 });
    }
}
