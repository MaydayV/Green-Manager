import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { classifySms, extractData } from '@/lib/sms-classifier';
import { sendAlertNotification, getBarkDeviceKey } from '@/lib/notification';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('Received callback:', body);

        const { type, devId } = body;

        if (!devId) {
            return NextResponse.json({ code: 101, msg: 'Missing devId' }, { status: 400 });
        }

        // Handle Heartbeat (998) or Status Report (stat cmd response)
        // 998 is the specific type for heartbeat, but 'stat' command response also has devId and wifi info.
        // We treat any message with devId and wifi/ip info as an opportunity to update device status.
        if (type === 998 || body.wifi) {
            const ip = body.wifi?.ip || request.headers.get('x-forwarded-for') || 'unknown';
            const wifiSsid = body.wifi?.ssid;
            const wifiSignal = body.wifi?.dbm;

            // Upsert Device
            await prisma.device.upsert({
                where: { id: devId },
                update: {
                    ip: ip,
                    lastSeen: new Date(),
                    status: 'online',
                },
                create: {
                    id: devId,
                    name: `Device ${devId.slice(-4)}`, // Default name
                    ip: ip,
                    status: 'online',
                    lastSeen: new Date(),
                },
            });

            // Log Status History
            if (wifiSsid || wifiSignal) {
                await prisma.deviceStatus.create({
                    data: {
                        deviceId: devId,
                        wifiSsid: wifiSsid,
                        wifiStrength: typeof wifiSignal === 'number' ? wifiSignal : parseInt(wifiSignal || '0'),
                        timestamp: new Date(),
                    },
                });
            }

            return NextResponse.json({ code: 0 });
        }

        // Handle Incoming SMS (501)
        if (type === 501) {
            const { slot, phone, content, msgTs } = body;
            // Parse msgTs (e.g. 1750044391) or use current time if invalid/missing
            // msgTs from docs "1750044391" looks like seconds epoch? Or "202202..." string?
            // Docs say "msgTs": 1750044391 (numeric) in one place, but "devTime" is string.
            // Let's assume epoch seconds if number, or parse string.
            let timestamp = new Date();
            if (typeof msgTs === 'number') {
                timestamp = new Date(msgTs * 1000);
            } else if (typeof msgTs === 'string') {
                // Try parsing custom format if needed, for now standard constructor
                const date = new Date(msgTs);
                if (!isNaN(date.getTime())) timestamp = date;
            }

            // Classify and extract data from SMS
            const category = classifySms(content || '', phone);
            const extracted = extractData(content || '', category);

            await prisma.smsMessage.create({
                data: {
                    deviceId: devId,
                    slotNum: typeof slot === 'number' ? slot : parseInt(slot || '1'),
                    direction: 'incoming',
                    phone: phone || 'unknown',
                    content: content || '',
                    timestamp: timestamp,
                    isRead: false,
                    status: 'received',
                    category: category,
                    extractedData: Object.keys(extracted).length > 0 ? JSON.stringify(extracted) : null
                }
            });
            return NextResponse.json({ code: 0 });
        }

        // Handle Send SMS Success (502)
        if (type === 502) {
            const { tid } = body;
            if (tid) {
                // Find message by ID (we use TID as Message ID or Command ID)
                // For simplicity, we'll try to update CommandHistory or SmsMessage with this ID
                // Assuming TID was stored when sending.

                // Note: In real app, we might need a separate mapping if TID != UUID.
                // For now, let's look for a Pending Outgoing message with this TID if we stored it there?
                // Current Schema doesn't have a 'tid' field on SmsMessage explicitly, 
                // but we can use the 'id' if we set TID = ID when sending.
                try {
                    await prisma.smsMessage.update({
                        where: { id: tid },
                        data: { status: 'sent' }
                    });
                } catch (e) {
                    // Might be a CommandHistory ID
                    try {
                        await prisma.commandHistory.update({
                            where: { id: tid },
                            data: { status: 'success', result: JSON.stringify(body) }
                        });
                    } catch (e2) {
                        console.warn('Could not match TID 502 to SMS or Command', tid);
                    }
                }
            }
            return NextResponse.json({ code: 0 });
        }

        // Handle Incoming Call Ringing (601)
        if (type === 601) {
            const { slot, phNum, startTm } = body;
            const timestamp = new Date((typeof startTm === 'number' ? startTm : parseInt(startTm || '0')) * 1000);

            // 1. Record Call (Ringing)
            // We use a composite ID or generate one. Docs don't give a unique Call ID, so we might need to query by Device + Slot + "ongoing" or just create new.
            // Ideally we create a new record.
            const callRecord = await prisma.callRecord.create({
                data: {
                    deviceId: devId,
                    slotNum: typeof slot === 'number' ? slot : parseInt(slot || '1'),
                    direction: 'incoming',
                    phone: phNum || 'unknown',
                    startTime: timestamp,
                    status: 'ringing'
                }
            });

            // 2. Check Auto-Answer
            const device = await prisma.device.findUnique({ where: { id: devId } });
            if (device && device.autoAnswer && device.ip) {
                const token = crypto.createHash('md5').update('admin|admin').digest('hex'); // TODO: Use real creds
                const tts = encodeURIComponent(device.ttsContent || 'Hello');
                const slotNum = typeof slot === 'number' ? slot : 1;

                // telanswer command: p1=slot, p2=volume/duration?, p3=content
                // From docs: p1=slot, p2=55, p3=TTS Content, p4=playCount, p5=pause, p6=action(1=hangup)
                // Let's use standard params from docs example: p1=1, p2=55, p3=Text, p4=2, p5=1, p6=1
                const url = `http://${device.ip}/ctrl?token=${token}&cmd=telanswer&p1=${slotNum}&p2=55&p3=${tts}&p4=1&p5=1&p6=1`;

                console.log(`Auto-answering call on ${devId}: ${url}`);

                // Send command without waiting
                fetch(url).catch(err => console.error('Failed to auto-answer:', err));

                // Update status to 'answered' (optimistic)
                await prisma.callRecord.update({
                    where: { id: callRecord.id },
                    data: { status: 'answered' }
                });
            }

            return NextResponse.json({ code: 0 });
        }

        // Handle Call Hangup / End (603) - Also "Incoming Call Hangup" per docs
        if (type === 603) {
            const { slot, phNum, startTm, endTm } = body;
            const startTime = new Date((typeof startTm === 'number' ? startTm : parseInt(startTm || '0')) * 1000);
            const endTime = new Date((typeof endTm === 'number' ? endTm : parseInt(endTm || '0')) * 1000);
            const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

            // Find the most recent 'ringing' or 'answered' call for this device/slot/phone
            // OR just create a new record if we missed the start event.
            // Since 601 and 603 might not link easily without a CallID, we'll search for the last record created recently.

            const existingCall = await prisma.callRecord.findFirst({
                where: {
                    deviceId: devId,
                    slotNum: typeof slot === 'number' ? slot : parseInt(slot || '1'),
                    direction: 'incoming',
                    phone: phNum,
                    startTime: startTime // Should match exactly if reported consistently
                },
                orderBy: { startTime: 'desc' }
            });

            if (existingCall) {
                await prisma.callRecord.update({
                    where: { id: existingCall.id },
                    data: {
                        duration: duration,
                        status: 'completed'
                    }
                });
            } else {
                // If we missed 601 or it's a new flow, create the record now
                await prisma.callRecord.create({
                    data: {
                        deviceId: devId,
                        slotNum: typeof slot === 'number' ? slot : parseInt(slot || '1'),
                        direction: 'incoming',
                        phone: phNum || 'unknown',
                        startTime: startTime,
                        duration: duration,
                        status: 'completed' // or 'missed' if duration is 0? 
                        // Docs say 603 is just "Hangup". If duration is small/zero, maybe missed?
                        // Let's assume completed for now.
                    }
                });
            }

            return NextResponse.json({ code: 0 });
        }

        // Handle Wifi Status (100) or Heartbeat (998)
        if (type === 100 || type === 998) {
            const { wifi, ip, ssid, dbm } = body;
            // 998 often has 'wifi' object, 100 has flat fields. Normalize.
            const wifiIP = ip || wifi?.ip;
            const wifiSSID = ssid || wifi?.ssid;
            const wifiDBM = dbm || wifi?.dbm;

            await prisma.device.update({
                where: { id: devId },
                data: {
                    ip: wifiIP,
                    lastSeen: new Date(),
                    status: 'online'
                }
            });

            if (wifiDBM !== undefined) {
                await prisma.deviceStatus.create({
                    data: {
                        deviceId: devId,
                        wifiSsid: wifiSSID,
                        wifiStrength: typeof wifiDBM === 'number' ? wifiDBM : parseInt(wifiDBM || '0'),
                        timestamp: new Date()
                    }
                });

                // Alert Logic for Wifi
                const dbm = typeof wifiDBM === 'number' ? wifiDBM : parseInt(wifiDBM || '0');
                if (dbm < -100) {
                    const level = dbm < -110 ? 'critical' : 'warning';
                    const msg = `Wifi Signal Weak: ${dbm}dBm`;

                    // Check existing unresolved alert
                    const existing = await prisma.alert.findFirst({
                        where: { deviceId: devId, type: 'wifi_signal', isResolved: false }
                    });

                    if (!existing) {
                        const device = await prisma.device.findUnique({ where: { id: devId } });
                        await prisma.alert.create({
                            data: {
                                deviceId: devId,
                                type: 'wifi_signal',
                                message: msg,
                                level: level,
                            }
                        });
                        
                        // 发送 Bark 通知
                        const barkKey = getBarkDeviceKey();
                        if (barkKey) {
                            sendAlertNotification(
                                barkKey,
                                'wifi_signal',
                                msg,
                                device?.name || undefined,
                                level
                            ).catch(err => console.error('Failed to send Bark notification:', err));
                        }
                    }
                }
            }
            return NextResponse.json({ code: 0 });
        }

        // Handle SIM Ready (204)
        // 204: SIM卡已就绪
        if (type === 204) {
            const { slot } = body;
            const slotNum = typeof slot === 'number' ? slot : parseInt(slot || '1');
            
            await prisma.slot.upsert({
                where: {
                    deviceId_slotNum: {
                        deviceId: devId,
                        slotNum: slotNum
                    }
                },
                update: {
                    simStatus: 'OK',
                    updatedAt: new Date()
                },
                create: {
                    id: crypto.randomUUID(),
                    deviceId: devId,
                    slotNum: slotNum,
                    simStatus: 'OK'
                }
            });
            
            return NextResponse.json({ code: 0 });
        }

        // Handle SIM Error (209)
        // 209: SIM卡错误
        if (type === 209) {
            const { slot } = body;
            const slotNum = typeof slot === 'number' ? slot : parseInt(slot || '1');
            
            await prisma.slot.upsert({
                where: {
                    deviceId_slotNum: {
                        deviceId: devId,
                        slotNum: slotNum
                    }
                },
                update: {
                    simStatus: 'ERR',
                    updatedAt: new Date()
                },
                create: {
                    id: crypto.randomUUID(),
                    deviceId: devId,
                    slotNum: slotNum,
                    simStatus: 'ERR'
                }
            });
            
            // Create alert
            const existing = await prisma.alert.findFirst({
                where: { deviceId: devId, type: `sim_error_${slotNum}`, isResolved: false }
            });
            
            if (!existing) {
                const device = await prisma.device.findUnique({ where: { id: devId } });
                await prisma.alert.create({
                    data: {
                        deviceId: devId,
                        type: `sim_error_${slotNum}`,
                        message: `SIM卡槽${slotNum}错误`,
                        level: 'critical',
                    }
                });
                
                // 发送 Bark 通知
                const barkKey = getBarkDeviceKey();
                if (barkKey) {
                    sendAlertNotification(
                        barkKey,
                        `sim_error_${slotNum}`,
                        `SIM卡槽${slotNum}错误`,
                        device?.name || undefined,
                        'critical'
                    ).catch(err => console.error('Failed to send Bark notification:', err));
                }
            }
            
            return NextResponse.json({ code: 0 });
        }

        // Handle Device Slot Module Error (301)
        // 301: 设备卡槽模组异常
        if (type === 301) {
            const { slot } = body;
            const slotNum = typeof slot === 'number' ? slot : parseInt(slot || '1');
            
            await prisma.slot.upsert({
                where: {
                    deviceId_slotNum: {
                        deviceId: devId,
                        slotNum: slotNum
                    }
                },
                update: {
                    simStatus: 'ERR',
                    updatedAt: new Date()
                },
                create: {
                    id: crypto.randomUUID(),
                    deviceId: devId,
                    slotNum: slotNum,
                    simStatus: 'ERR'
                }
            });
            
            // Create alert
            const existing = await prisma.alert.findFirst({
                where: { deviceId: devId, type: `slot_module_error_${slotNum}`, isResolved: false }
            });
            
            if (!existing) {
                const device = await prisma.device.findUnique({ where: { id: devId } });
                await prisma.alert.create({
                    data: {
                        deviceId: devId,
                        type: `slot_module_error_${slotNum}`,
                        message: `设备卡槽${slotNum}模组异常`,
                        level: 'critical',
                    }
                });
                
                // 发送 Bark 通知
                const barkKey = getBarkDeviceKey();
                if (barkKey) {
                    sendAlertNotification(
                        barkKey,
                        `slot_module_error_${slotNum}`,
                        `设备卡槽${slotNum}模组异常`,
                        device?.name || undefined,
                        'critical'
                    ).catch(err => console.error('Failed to send Bark notification:', err));
                }
            }
            
            return NextResponse.json({ code: 0 });
        }

        // Handle Command Response (999) - especially stat command
        // 999: 控制命令结果反馈
        if (type === 999) {
            // Check if this is a stat command response
            if (body.slot) {
                const slot = body.slot;
                
                // Process slot1
                if (slot.slot1_sta && slot.slot1_sta !== 'ERR') {
                    await prisma.slot.upsert({
                        where: {
                            deviceId_slotNum: {
                                deviceId: devId,
                                slotNum: 1
                            }
                        },
                        update: {
                            operator: slot.sim1_op || slot.sim1op,
                            simStatus: slot.sim1_sta || slot.sim1sta || 'OK',
                            signalStrength: slot.sim1_dbm || slot.sim1dbm ? parseInt(String(slot.sim1_dbm || slot.sim1dbm)) : undefined,
                            iccid: slot.sim1_iccId || slot.sim1iccId || slot.sim1_iccid || slot.sim1iccid,
                            imsi: slot.sim1_imsi || slot.sim1imsi,
                            phoneNumber: slot.sim1_msIsdn || slot.sim1msIsdn || slot.sim1_msisdn || slot.sim1msisdn,
                            updatedAt: new Date()
                        },
                        create: {
                            id: crypto.randomUUID(),
                            deviceId: devId,
                            slotNum: 1,
                            operator: slot.sim1_op || slot.sim1op,
                            simStatus: slot.sim1_sta || slot.sim1sta || 'OK',
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
                                deviceId: devId,
                                slotNum: 2
                            }
                        },
                        update: {
                            operator: slot.sim2_op || slot.sim2op,
                            simStatus: slot.sim2_sta || slot.sim2sta || 'OK',
                            signalStrength: slot.sim2_dbm || slot.sim2dbm ? parseInt(String(slot.sim2_dbm || slot.sim2dbm)) : undefined,
                            iccid: slot.sim2_iccId || slot.sim2iccId || slot.sim2_iccid || slot.sim2iccid,
                            imsi: slot.sim2_imsi || slot.sim2imsi,
                            phoneNumber: slot.sim2_msIsdn || slot.sim2msIsdn || slot.sim2_msisdn || slot.sim2msisdn,
                            updatedAt: new Date()
                        },
                        create: {
                            id: crypto.randomUUID(),
                            deviceId: devId,
                            slotNum: 2,
                            operator: slot.sim2_op || slot.sim2op,
                            simStatus: slot.sim2_sta || slot.sim2sta || 'OK',
                            signalStrength: slot.sim2_dbm || slot.sim2dbm ? parseInt(String(slot.sim2_dbm || slot.sim2dbm)) : undefined,
                            iccid: slot.sim2_iccId || slot.sim2iccId || slot.sim2_iccid || slot.sim2iccid,
                            imsi: slot.sim2_imsi || slot.sim2imsi,
                            phoneNumber: slot.sim2_msIsdn || slot.sim2msIsdn || slot.sim2_msisdn || slot.sim2msisdn
                        }
                    });
                }
                
                // Update device status
                if (body.wifi) {
                    await prisma.device.update({
                        where: { id: devId },
                        data: {
                            ip: body.wifi.ip,
                            lastSeen: new Date(),
                            status: 'online'
                        }
                    });
                }
            }
            
            return NextResponse.json({ code: 0 });
        }

        // Handle SIM Status (101, 102, 203)
        // 101=SIM1 Net, 102=SIM2 Net, 203=SIM Info
        if (type === 101 || type === 102 || type === 203) {
            const { slot, dbm, imsi, iccid, msIsdn, operator } = body;
            const slotNum = typeof slot === 'number' ? slot : parseInt(slot || '1');
            const signalVal = typeof dbm === 'number' ? dbm : (dbm ? parseInt(dbm) : undefined);

            await prisma.slot.upsert({
                where: {
                    deviceId_slotNum: {
                        deviceId: devId,
                        slotNum: slotNum
                    }
                },
                update: {
                    signalStrength: signalVal,
                    imsi: imsi,
                    iccid: iccid,
                    phoneNumber: msIsdn,
                    operator: operator,
                    updatedAt: new Date()
                },
                create: {
                    deviceId: devId,
                    slotNum: slotNum,
                    signalStrength: signalVal,
                    imsi: imsi,
                    iccid: iccid,
                    phoneNumber: msIsdn,
                    operator: operator
                }
            });

            // Alert Logic for SIM
            if (signalVal !== undefined && signalVal < -100) {
                const level = signalVal < -110 ? 'critical' : 'warning';
                const msg = `SIM Slot ${slotNum} Signal Weak: ${signalVal}dBm`;

                const existing = await prisma.alert.findFirst({
                    where: { deviceId: devId, type: `sim_signal_${slotNum}`, isResolved: false }
                });

                if (!existing) {
                    const device = await prisma.device.findUnique({ where: { id: devId } });
                    await prisma.alert.create({
                        data: {
                            deviceId: devId,
                            type: `sim_signal_${slotNum}`,
                            message: msg,
                            level: level,
                        }
                    });
                    
                    // 发送 Bark 通知
                    const barkKey = getBarkDeviceKey();
                    if (barkKey) {
                        sendAlertNotification(
                            barkKey,
                            `sim_signal_${slotNum}`,
                            msg,
                            device?.name || undefined,
                            level
                        ).catch(err => console.error('Failed to send Bark notification:', err));
                    }
                }
            }
            return NextResponse.json({ code: 0 });
        }

        return NextResponse.json({ code: 0 }); // Acknowledge unknown
    } catch (error) {
        console.error('Callback error:', error);
        return NextResponse.json({ code: 101, msg: 'Internal Error' }, { status: 500 });
    }
}

