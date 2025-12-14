import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * 验证手机号码格式
 * 支持：
 * - 中国手机号：11位，1开头（如：13800138000）
 * - 国际格式：+开头，后跟国家代码和号码（如：+8613800138000）
 * @param phone 手机号码
 * @returns 是否为有效格式
 */
export function isValidPhoneNumber(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
        return false;
    }

    const trimmed = phone.trim();
    
    // 中国手机号：11位，1开头
    const chinesePhoneRegex = /^1[3-9]\d{9}$/;
    if (chinesePhoneRegex.test(trimmed)) {
        return true;
    }

    // 国际格式：+开头，后跟国家代码和号码（总长度不超过15位，最少7位）
    const internationalPhoneRegex = /^\+[1-9]\d{6,14}$/;
    if (internationalPhoneRegex.test(trimmed)) {
        return true;
    }

    return false;
}

/**
 * 验证并格式化手机号码列表
 * @param phones 手机号码字符串（逗号或换行分隔）
 * @returns 验证后的手机号码数组，无效的会被过滤掉
 */
export function validatePhoneNumbers(phones: string): { valid: string[]; invalid: string[] } {
    if (!phones || typeof phones !== 'string') {
        return { valid: [], invalid: [] };
    }

    const phoneList = phones.split(/[,\n]/).map(p => p.trim()).filter(p => p);
    const valid: string[] = [];
    const invalid: string[] = [];

    phoneList.forEach(phone => {
        if (isValidPhoneNumber(phone)) {
            valid.push(phone);
        } else {
            invalid.push(phone);
        }
    });

    return { valid, invalid };
}
