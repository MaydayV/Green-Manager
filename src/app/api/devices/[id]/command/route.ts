import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import crypto from 'crypto';
import { logAuditEvent } from '@/app/api/audit/route';

const prisma = new PrismaClient();

// Valid commands that can be sent to devices
const VALID_COMMANDS = [
    'stat',      // Get device status
    'restart',   // Restart device
    'otanow',    // Trigger OTA update
    'slotrst',   // Restart SIM slot
    'slotoff',   // Turn off SIM slot
    'sendsms',   // Send SMS
    'teldial',   // Make phone call
    'telanswer', // Answer incoming call
    'telhangup', // Hang up call
    'telkeypress', // Send key press during call
    'telstarttts', // Play TTS during call
    'telstoptts',  // Stop TTS
    'addwf',     // Add WiFi
    'delwf',     // Delete WiFi
    'wf',        // Toggle WiFi
    'pingsec',   // Set ping interval
    'dailyrst',  // Set daily restart time
    'dailyota',  // Set daily OTA time
];

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const { command, ...commandParams } = body;

        if (!command || !VALID_COMMANDS.includes(command)) {
            return NextResponse.json({
                error: 'Invalid command',
                validCommands: VALID_COMMANDS
            }, { status: 400 });
        }

        // Get device info
        const device = await prisma.device.findUnique({
            where: { id }
        });

        if (!device) {
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        if (!device.ip) {
            return NextResponse.json({ error: 'Device IP not available' }, { status: 400 });
        }

        // Generate token (default admin|admin for now)
        const token = device.token || crypto.createHash('md5').update('admin|admin').digest('hex');

        // Generate a unique transaction ID for tracking
        const tid = crypto.randomUUID();

        // Build URL for device
        const urlParams = new URLSearchParams({
            token,
            cmd: command,
        });

        // Command-specific parameter mapping
        if (command === 'sendsms') {
            // Map sendsms parameters: slot -> p1, phone -> p2, content -> p3
            const slot = commandParams.slot || commandParams.p1 || '1';
            const phone = commandParams.phone || commandParams.p2;
            const content = commandParams.content || commandParams.p3;
            
            if (!phone || !content) {
                return NextResponse.json({ error: 'Missing phone or content for sendsms' }, { status: 400 });
            }
            
            urlParams.append('p1', String(slot));
            urlParams.append('p2', String(phone));
            urlParams.append('p3', String(content));
            urlParams.append('tid', tid); // tid is required for sendsms
        } else if (command === 'teldial') {
            // Map teldial parameters: slot -> p1, phone -> p2, duration -> p3, tts -> p4, etc.
            const slot = commandParams.slot || commandParams.p1 || '1';
            const phone = commandParams.phone || commandParams.p2;
            const duration = commandParams.duration || commandParams.p3 || '175';
            const tts = commandParams.ttsContent || commandParams.tts || commandParams.p4 || '';
            const ttsRepeat = commandParams.ttsRepeat || commandParams.p5 || '2';
            const pause = commandParams.ttsPause || commandParams.pause || commandParams.p6 || '1';
            const action = commandParams.actionAfterTts || commandParams.action || commandParams.p7 || '1';
            
            if (!phone) {
                return NextResponse.json({ error: 'Missing phone for teldial' }, { status: 400 });
            }
            
            urlParams.append('p1', String(slot));
            urlParams.append('p2', String(phone));
            urlParams.append('p3', String(duration));
            if (tts) urlParams.append('p4', String(tts));
            urlParams.append('p5', String(ttsRepeat));
            urlParams.append('p6', String(pause));
            urlParams.append('p7', String(action));
        } else if (command === 'telkeypress') {
            // Map telkeypress parameters: slot -> p1, keys -> p2
            const slot = commandParams.slot || commandParams.p1 || '1';
            const keys = commandParams.keys || commandParams.p2;
            const keyDuration = commandParams.keyDuration || commandParams.p3 || '200';
            const keyInterval = commandParams.keyInterval || commandParams.p4 || '100';
            
            if (!keys) {
                return NextResponse.json({ error: 'Missing keys for telkeypress' }, { status: 400 });
            }
            
            urlParams.append('p1', String(slot));
            urlParams.append('p2', String(keys));
            urlParams.append('p3', String(keyDuration));
            urlParams.append('p4', String(keyInterval));
        } else {
            // For other commands, add parameters as-is or map common ones
            Object.entries(commandParams).forEach(([key, value]) => {
                if (value !== undefined && value !== null && key !== 'slot' && key !== 'phone' && key !== 'content') {
                    // If key starts with 'p', use it directly, otherwise try to map
                    if (key.startsWith('p')) {
                        urlParams.append(key, String(value));
                    } else if (key === 'slot' && command === 'slotrst') {
                        urlParams.append('p1', String(value));
                    } else if (key === 'slot' && command === 'slotoff') {
                        urlParams.append('p1', String(value));
                    } else {
                        urlParams.append(key, String(value));
                    }
                }
            });
            
            // Add tid for commands that might need it (optional for most commands)
            if (commandParams.tid) {
                urlParams.append('tid', String(commandParams.tid));
            }
        }

        const deviceUrl = `http://${device.ip}/ctrl?${urlParams.toString()}`;

        // Log command to history
        const commandHistory = await prisma.commandHistory.create({
            data: {
                id: tid,
                deviceId: id,
                command: command,
                params: JSON.stringify(commandParams),
                status: 'pending',
            }
        });

        // Log to audit
        await logAuditEvent(
            session.user?.id || null,
            'device_command',
            id,
            { command, params: commandParams, deviceName: device.name }
        );

        // Send command to device
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(deviceUrl, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const result = await response.json();

            // Update command history
            await prisma.commandHistory.update({
                where: { id: tid },
                data: {
                    status: result.code === 0 ? 'success' : 'failed',
                    result: JSON.stringify(result),
                    executedAt: new Date(),
                }
            });

            return NextResponse.json({
                success: result.code === 0,
                tid,
                result,
            });
        } catch (fetchError: unknown) {
            const errorMessage = fetchError instanceof Error ? fetchError.message : 'Network error';

            // Update command history with failure
            await prisma.commandHistory.update({
                where: { id: tid },
                data: {
                    status: 'failed',
                    result: JSON.stringify({ error: errorMessage }),
                    executedAt: new Date(),
                }
            });

            return NextResponse.json({
                success: false,
                tid,
                error: errorMessage,
            }, { status: 502 });
        }
    } catch (error) {
        console.error('Command error:', error);
        return NextResponse.json({ error: 'Failed to send command' }, { status: 500 });
    }
}

// GET command history for this device
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const commands = await prisma.commandHistory.findMany({
            where: { deviceId: id },
            orderBy: { sentAt: 'desc' },
            take: 50,
        });

        return NextResponse.json(commands);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch command history' }, { status: 500 });
    }
}
