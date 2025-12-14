// SMS智能分类和解析引擎

export interface ExtractedData {
    verificationCode?: string;
    balance?: number;
    trackingNumber?: string;
    amount?: number;
    date?: string;
    [key: string]: any;
}

export function classifySms(content: string, phone?: string): string {
    const lowerContent = content.toLowerCase();

    // 验证码识别
    if (
        /验证码|校验码|动态码|验证码是|code is|verification/i.test(content) ||
        /\d{4,8}/.test(content) && /验证|校验|动态/i.test(content)
    ) {
        return 'verification';
    }

    // 银行通知识别
    if (
        /银行|账户|余额|交易|支付|转账|消费|存款|取款|信用卡|借记卡/i.test(content) ||
        /[\d,]+\.?\d*元/.test(content) && /余额|交易|支付/i.test(content)
    ) {
        return 'bank';
    }

    // 营销短信识别
    if (
        /优惠|促销|折扣|活动|特价|限时|抢购|秒杀|会员|积分|兑换/i.test(content) ||
        /点击|链接|详情|了解更多/i.test(content)
    ) {
        return 'promotion';
    }

    // 快递通知识别
    if (
        /快递|物流|配送|派送|签收|取件|包裹|单号/i.test(content) ||
        /[A-Z0-9]{10,}/.test(content) && /快递|物流/i.test(content)
    ) {
        return 'express';
    }

    return 'general';
}

export function extractData(content: string, category: string): ExtractedData {
    const extracted: ExtractedData = {};

    if (category === 'verification') {
        // 提取验证码（通常是4-8位数字）
        const codeMatch = content.match(/(?:验证码|校验码|动态码|code)[:：]?\s*(\d{4,8})/i);
        if (codeMatch) {
            extracted.verificationCode = codeMatch[1];
        } else {
            // 如果没有明确标识，尝试提取连续的数字
            const numbers = content.match(/\d{4,8}/g);
            if (numbers && numbers.length === 1) {
                extracted.verificationCode = numbers[0];
            }
        }
    }

    if (category === 'bank') {
        // 提取余额
        const balanceMatch = content.match(/(?:余额|账户余额)[:：]?[\s]*([\d,]+\.?\d*)\s*元/i);
        if (balanceMatch) {
            extracted.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
        }

        // 提取交易金额
        const amountMatch = content.match(/(?:交易|支付|转账|消费)[:：]?[\s]*([\d,]+\.?\d*)\s*元/i);
        if (amountMatch) {
            extracted.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        }

        // 提取日期
        const dateMatch = content.match(/(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/);
        if (dateMatch) {
            extracted.date = dateMatch[1];
        }
    }

    if (category === 'express') {
        // 提取快递单号
        const trackingMatch = content.match(/(?:单号|运单号|快递号)[:：]?\s*([A-Z0-9]{10,})/i);
        if (trackingMatch) {
            extracted.trackingNumber = trackingMatch[1];
        } else {
            // 尝试提取长串字母数字组合
            const longCode = content.match(/[A-Z0-9]{12,}/);
            if (longCode) {
                extracted.trackingNumber = longCode[0];
            }
        }
    }

    return extracted;
}
