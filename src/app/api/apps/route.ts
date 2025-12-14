import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

const INITIAL_APPS = [
    // 基础应用
    {
        name: '生日祝福自动机',
        description: '导入生日列表，自动发送生日祝福短信或电话，支持提前N天提醒和多种祝福方式。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '生活',
        author: '系统',
        features: '["生日列表管理", "祝福模板", "提前提醒", "多种祝福方式"]'
    },
    {
        name: '节日营销助手',
        description: '节日日历管理，节日祝福模板库，批量发送计划和效果追踪分析。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '营销',
        author: '系统',
        features: '["节日日历", "祝福模板", "批量发送", "效果分析"]'
    },
    {
        name: '企业通知系统',
        description: '员工通讯录管理，会议通知模板，考勤异常提醒，薪资发放通知。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '商务',
        author: '系统',
        features: '["通讯录管理", "通知模板", "考勤提醒", "薪资通知"]'
    },
    {
        name: '教育提醒系统',
        description: '学生作业提醒，家长会通知，成绩发布，校园活动通知。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '教育',
        author: '系统',
        features: '["作业提醒", "家长会通知", "成绩发布", "活动通知"]'
    },
    {
        name: '医疗健康助手',
        description: '服药提醒，复诊预约，健康知识推送，紧急联系人通知。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '健康',
        author: '系统',
        features: '["服药提醒", "复诊预约", "健康推送", "紧急通知"]'
    },
    {
        name: '快递通知管家',
        description: '快递单号批量导入，自动发送取件通知，派件进度更新，签收确认收集。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '生活',
        author: '系统',
        features: '["单号导入", "取件通知", "进度更新", "签收确认"]'
    },
    {
        name: '物业管理系统',
        description: '物业费催缴，停水停电通知，社区活动通知，紧急事件广播。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '生活',
        author: '系统',
        features: '["费用催缴", "停水停电通知", "活动通知", "紧急广播"]'
    },
    {
        name: '车辆服务提醒',
        description: '年检提醒，保险到期，保养提醒，违章通知。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '生活',
        author: '系统',
        features: '["年检提醒", "保险到期", "保养提醒", "违章通知"]'
    },
    // 智能应用
    {
        name: '智能客服系统',
        description: '常见问题知识库，自动问题分类，智能路由（转人工/自动回复），客户满意度调查。',
        version: '1.0.0',
        icon: 'bot',
        category: '智能',
        author: '系统',
        features: '["知识库", "问题分类", "智能路由", "满意度调查"]'
    },
    {
        name: '语音验证码系统',
        description: '替代短信验证码，语音播报6位数字，多语言支持，频率限制与防攻击。',
        version: '1.0.0',
        icon: 'bot',
        category: '智能',
        author: '系统',
        features: '["语音验证码", "多语言", "防攻击", "频率限制"]'
    },
    {
        name: '电话会议助理',
        description: '会议邀请自动拨打，参会确认收集，会议提醒（提前15分钟），会议纪要自动发送。',
        version: '1.0.0',
        icon: 'bot',
        category: '商务',
        author: '系统',
        features: '["自动拨打", "参会确认", "会议提醒", "纪要发送"]'
    },
    {
        name: '语音问卷调查',
        description: '问卷设计器，自动外呼收集答案，按键选择统计，实时结果分析。',
        version: '1.0.0',
        icon: 'bot',
        category: '智能',
        author: '系统',
        features: '["问卷设计", "自动外呼", "按键统计", "结果分析"]'
    },
    {
        name: '智能电话营销',
        description: '客户名单管理，话术脚本，拨打记录自动填写，意向客户分级。',
        version: '1.0.0',
        icon: 'bot',
        category: '营销',
        author: '系统',
        features: '["客户管理", "话术脚本", "记录填写", "客户分级"]'
    },
    {
        name: '多语言翻译助手',
        description: '实时电话翻译，支持中英日韩等常见语言，商务谈判辅助，旅游沟通助手。',
        version: '1.0.0',
        icon: 'bot',
        category: '智能',
        author: '系统',
        features: '["实时翻译", "多语言", "商务辅助", "旅游助手"]'
    },
    // 趣味应用
    {
        name: '情感陪伴机器人',
        description: '睡前故事，早安问候（天气+励志语录），情感倾诉，节日祝福，亲情连线，孤独陪伴。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '娱乐',
        author: '系统',
        features: '["睡前故事", "早安问候", "情感倾诉", "节日祝福"]'
    },
    {
        name: '语音游戏中心',
        description: '猜数字游戏，成语接龙，脑筋急转弯，语音版狼人杀（多人参与）。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '娱乐',
        author: '系统',
        features: '["猜数字", "成语接龙", "脑筋急转弯", "狼人杀"]'
    },
    {
        name: '语音日记本',
        description: '每日语音记录，情绪标签，自动转文字存档，回忆提醒（一年前的今天）。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '工具',
        author: '系统',
        features: '["语音记录", "情绪标签", "文字存档", "回忆提醒"]'
    },
    {
        name: '语音闹钟系列',
        description: '温柔唤醒（渐进音量），自定义提醒录音，重要日期倒计时，事件提醒链。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '工具',
        author: '系统',
        features: '["温柔唤醒", "自定义录音", "倒计时", "提醒链"]'
    },
    {
        name: '语音祝福定制',
        description: '名人声音模仿（AI合成），特效音效添加，背景音乐混合，定时惊喜发送。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '娱乐',
        author: '系统',
        features: '["声音模仿", "特效音效", "背景音乐", "定时发送"]'
    },
    {
        name: '语音抽奖系统',
        description: '电话参与抽奖，按键确认参与，自动播报中奖结果，中奖通知自动拨打。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '营销',
        author: '系统',
        features: '["电话抽奖", "按键确认", "结果播报", "通知拨打"]'
    },
    {
        name: '语音读书会',
        description: '每日一段好书，订阅制内容，多本书籍可选，读书进度记忆。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '娱乐',
        author: '系统',
        features: '["每日好书", "订阅内容", "多书选择", "进度记忆"]'
    },
    {
        name: '语音天气管家',
        description: '定时播报天气，恶劣天气预警，穿衣建议，出行提示。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '工具',
        author: '系统',
        features: '["定时播报", "天气预警", "穿衣建议", "出行提示"]'
    },
    // 实用工具
    {
        name: '电话转移服务',
        description: '多设备联动接听，按时间/地点转移，呼叫等待队列，未接来电自动回拨。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '工具',
        author: '系统',
        features: '["多设备联动", "时间地点转移", "等待队列", "自动回拨"]'
    },
    {
        name: '语音备忘录',
        description: '快速录音备忘，自动分类整理，语音搜索，分享功能。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '工具',
        author: '系统',
        features: '["快速录音", "自动分类", "语音搜索", "分享功能"]'
    },
    {
        name: '电话号码检测',
        description: '空号检测，关机状态检测，停机检测，高频骚扰号码标记。',
        version: '1.0.0',
        icon: 'activity',
        category: '工具',
        author: '系统',
        features: '["空号检测", "关机检测", "停机检测", "骚扰标记"]'
    },
    {
        name: '通话录音取证',
        description: '合规录音（提示音），加密存储，时间戳认证，司法可用性保障。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '工具',
        author: '系统',
        features: '["合规录音", "加密存储", "时间戳", "司法保障"]'
    },
    {
        name: '国际电话助手',
        description: '时区智能计算，资费实时估算，拨号规则自动适配，通话质量监控。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '工具',
        author: '系统',
        features: '["时区计算", "资费估算", "拨号适配", "质量监控"]'
    },
    // 系统工具
    {
        name: '微信通知转发',
        description: '通过企业微信Webhook转发短信消息到微信群，支持按发送者过滤。',
        version: '1.0.0',
        icon: 'message-circle',
        category: '通知',
        author: '系统',
        features: '["微信转发", "发送者过滤", "Webhook集成"]'
    },
    {
        name: '数据导出工具',
        description: '导出短信和通话记录到CSV/Excel格式，支持日期范围筛选。',
        version: '1.2.0',
        icon: 'file-spreadsheet',
        category: '工具',
        author: '系统',
        features: '["CSV导出", "Excel导出", "日期筛选"]'
    },
    {
        name: '自动回复机器人',
        description: '基于关键词自动回复短信，支持正则表达式匹配。',
        version: '0.9.0',
        icon: 'bot',
        category: '自动化',
        author: '系统',
        features: '["关键词匹配", "正则支持", "自动回复"]'
    },
    {
        name: '网络监控器',
        description: '高级网络统计和连接日志分析，信号强度图表，断线告警。',
        version: '1.0.1',
        icon: 'activity',
        category: '监控',
        author: '系统',
        features: '["信号图表", "断线告警", "日志分析"]'
    }
];

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // Lazy Seeding - only if database is empty
        const count = await prisma.systemApp.count();
        if (count === 0) {
            console.log('Initializing apps database...');
            try {
                await prisma.systemApp.createMany({ data: INITIAL_APPS });
                console.log(`Successfully initialized ${INITIAL_APPS.length} apps`);
            } catch (seedError: any) {
                console.error('Failed to seed apps:', seedError);
                // Continue even if seeding fails
            }
        }

        const apps = await prisma.systemApp.findMany({
            include: {
                installs: true
            },
            orderBy: [
                { category: 'asc' },
                { name: 'asc' }
            ]
        });

        // Map to easier FE format
        const result = apps.map(app => ({
            id: app.id,
            name: app.name,
            description: app.description,
            version: app.version,
            icon: app.icon || 'box',
            category: app.category,
            isInstalled: app.installs.length > 0,
            installId: app.installs[0]?.id || undefined
        }));

        console.log(`Returning ${result.length} apps from database`);
        return NextResponse.json(result);
    } catch (e: any) {
        console.error('Failed to fetch apps:', e);
        return NextResponse.json({ 
            error: 'Failed to fetch apps',
            details: e.message 
        }, { status: 500 });
    }
}
