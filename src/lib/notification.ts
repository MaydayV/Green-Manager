/**
 * Bark 通知服务
 * Bark 是一个 iOS 设备通知推送服务
 * API 文档: https://github.com/Finb/Bark
 */

interface BarkNotificationOptions {
    title?: string;
    body: string;
    deviceKey: string;
    url?: string;
    group?: string;
    icon?: string;
    sound?: string;
    level?: 'active' | 'timeSensitive' | 'passive' | 'critical';
    badge?: number;
    copy?: string;
    autoCopy?: boolean;
}

/**
 * 发送 Bark 通知
 */
export async function sendBarkNotification(options: BarkNotificationOptions): Promise<boolean> {
    const { deviceKey, title, body, url, group, icon, sound, level, badge, copy, autoCopy } = options;

    if (!deviceKey) {
        console.error('Bark device key is required');
        return false;
    }

    try {
        // 构建 URL，支持自建服务器或官方服务器
        const baseUrl = process.env.BARK_BASE_URL || 'https://api.day.app';
        const encodedTitle = title ? encodeURIComponent(title) : '';
        const encodedBody = encodeURIComponent(body);
        
        let notificationUrl = `${baseUrl}/${deviceKey}`;
        
        if (encodedTitle) {
            notificationUrl += `/${encodedTitle}/${encodedBody}`;
        } else {
            notificationUrl += `/${encodedBody}`;
        }

        // 构建查询参数
        const params = new URLSearchParams();
        if (url) params.append('url', url);
        if (group) params.append('group', group);
        if (icon) params.append('icon', icon);
        if (sound) params.append('sound', sound);
        if (level) params.append('level', level);
        if (badge !== undefined) params.append('badge', badge.toString());
        if (copy) params.append('copy', copy);
        if (autoCopy) params.append('autoCopy', '1');

        if (params.toString()) {
            notificationUrl += `?${params.toString()}`;
        }

        const response = await fetch(notificationUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error(`Bark notification failed: ${response.status} ${response.statusText}`);
            return false;
        }

        const result = await response.json();
        
        // Bark API 返回格式: { code: 200, message: "success", timestamp: ... }
        if (result.code === 200 || response.ok) {
            console.log('Bark notification sent successfully');
            return true;
        } else {
            console.error(`Bark notification failed: ${result.message || 'Unknown error'}`);
            return false;
        }
    } catch (error) {
        console.error('Error sending Bark notification:', error);
        return false;
    }
}

/**
 * 发送告警通知
 */
export async function sendAlertNotification(
    deviceKey: string,
    alertType: string,
    message: string,
    deviceName?: string,
    level: 'info' | 'warning' | 'error' | 'critical' = 'warning'
): Promise<boolean> {
    const titleMap: Record<string, string> = {
        'wifi_signal': 'WiFi信号弱',
        'sim_error_1': 'SIM卡槽1错误',
        'sim_error_2': 'SIM卡槽2错误',
        'slot_module_error_1': '卡槽1模组异常',
        'slot_module_error_2': '卡槽2模组异常',
        'sim_signal_1': 'SIM卡槽1信号弱',
        'sim_signal_2': 'SIM卡槽2信号弱',
    };

    const title = titleMap[alertType] || '设备告警';
    const fullMessage = deviceName ? `[${deviceName}] ${message}` : message;
    
    // 根据告警级别设置 Bark 的 level
    const barkLevel = level === 'critical' ? 'critical' : 
                      level === 'error' ? 'active' : 
                      level === 'warning' ? 'timeSensitive' : 
                      'passive';

    return await sendBarkNotification({
        deviceKey,
        title,
        body: fullMessage,
        group: 'Green-Manager-Alerts',
        level: barkLevel,
        sound: level === 'critical' ? 'alarm' : 'default',
    });
}

/**
 * 获取 Bark 设备密钥（从环境变量或配置）
 */
export function getBarkDeviceKey(): string | null {
    // 优先从环境变量获取
    if (process.env.BARK_DEVICE_KEY) {
        return process.env.BARK_DEVICE_KEY;
    }
    
    // 可以从数据库配置中获取（如果有配置表）
    // 暂时返回 null，需要配置环境变量
    return null;
}
