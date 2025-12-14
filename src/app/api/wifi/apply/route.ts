import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import { getAdminToken } from '@/app/api/devices/route';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { deviceIds, templateId, ssid, password } = await request.json();

        if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
            return NextResponse.json({ error: 'deviceIds array is required' }, { status: 400 });
        }

        let wifiSsid = ssid;
        let wifiPassword = password;

        // If templateId is provided, get template details
        if (templateId) {
            const template = await prisma.wifiTemplate.findUnique({
                where: { id: templateId }
            });
            if (template) {
                wifiSsid = template.ssid;
                wifiPassword = template.password;
            }
        }

        if (!wifiSsid || !wifiPassword) {
            return NextResponse.json({ error: 'SSID and password are required' }, { status: 400 });
        }

        const devices = await prisma.device.findMany({
            where: { id: { in: deviceIds } }
        });

        const token = getAdminToken();
        const results = [];

        for (const device of devices) {
            if (!device.ip) {
                results.push({ deviceId: device.id, success: false, error: 'Device offline (no IP)' });
                continue;
            }

            try {
                // Apply WiFi config using addwf command
                const url = `http://${device.ip}/ctrl?token=${token}&cmd=addwf&p1=${encodeURIComponent(wifiSsid)}&p2=${encodeURIComponent(wifiPassword)}`;
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    if (data.code === 0) {
                        // Save to database
                        await prisma.deviceWifiConfig.create({
                            data: {
                                deviceId: device.id,
                                templateId: templateId || null,
                                ssid: wifiSsid,
                                password: wifiPassword,
                                priority: 0,
                                isActive: true
                            }
                        });

                        results.push({ deviceId: device.id, success: true });
                    } else {
                        results.push({ deviceId: device.id, success: false, error: data.msg || 'Failed' });
                    }
                } else {
                    results.push({ deviceId: device.id, success: false, error: 'Network error' });
                }
            } catch (e: any) {
                results.push({ deviceId: device.id, success: false, error: e.message });
            }
        }

        return NextResponse.json({ results });
    } catch (e: any) {
        console.error('Failed to apply WiFi config:', e);
        return NextResponse.json({ error: 'Failed to apply WiFi config' }, { status: 500 });
    }
}
