'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

interface AppConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    app: {
        id: string;
        name: string;
        description: string;
        installId?: string;
    } | null;
}

export function AppConfigDialog({ open, onOpenChange, app }: AppConfigDialogProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<any>({});

    useEffect(() => {
        if (open && app?.installId) {
            fetchConfig();
        } else {
            setConfig({});
        }
    }, [open, app?.installId]);

    const fetchConfig = async () => {
        if (!app?.installId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/apps/config/${app.installId}`);
            if (res.ok) {
                const data = await res.json();
                setConfig(data.config || {});
            }
        } catch (e) {
            console.error('Failed to fetch config:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!app?.installId) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/apps/config/${app.installId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config })
            });
            if (res.ok) {
                onOpenChange(false);
            } else {
                alert('保存配置失败');
            }
        } catch (e) {
            console.error('Failed to save config:', e);
            alert('保存配置失败，请重试');
        } finally {
            setSaving(false);
        }
    };

    // 根据应用类型生成不同的配置表单
    const renderConfigForm = () => {
        if (!app) return null;

        // 根据应用名称生成不同的配置项
        const appName = app.name;

        // 通用配置项
        const commonConfigs: Record<string, any> = {
            enabled: { type: 'switch', label: '启用应用', default: true },
            deviceId: { type: 'select', label: '目标设备', options: [] },
        };

        // 特定应用的配置 - 完整的配置项定义
        const appSpecificConfigs: Record<string, any> = {
            // 基础应用
            '生日祝福自动机': {
                birthdayList: { type: 'textarea', label: '生日列表（每行一个：姓名,日期,手机号）', placeholder: '张三,1990-01-01,13800138000\n李四,1992-05-15,13900139000', description: '格式：姓名,生日日期,手机号码' },
                template: { type: 'textarea', label: '祝福模板', placeholder: '亲爱的{name}，今天是您的生日，祝您生日快乐！', description: '支持变量：{name}（姓名）' },
                advanceDays: { type: 'input', label: '提前提醒天数', inputType: 'number', default: '1', description: '提前几天发送祝福' },
                sendMethod: { type: 'select', label: '发送方式', options: ['短信', '电话', 'TTS'], default: '短信', description: '选择祝福发送方式' },
                sendTime: { type: 'input', label: '发送时间', inputType: 'time', default: '09:00', description: '每日发送祝福的时间' },
            },
            '节日营销助手': {
                festivalList: { type: 'textarea', label: '节日列表（JSON格式）', placeholder: '[{"name":"春节","date":"2024-02-10"},{"name":"中秋节","date":"2024-09-17"}]', description: 'JSON数组，包含name（节日名）和date（日期）' },
                template: { type: 'textarea', label: '祝福模板', placeholder: '祝您{festival}快乐，{customMessage}', description: '支持变量：{festival}（节日名）' },
                sendTime: { type: 'input', label: '发送时间', inputType: 'time', default: '09:00', description: '节日当天发送祝福的时间' },
                targetPhones: { type: 'textarea', label: '目标号码列表（每行一个）', placeholder: '13800138000\n13900139000', description: '接收节日祝福的手机号码列表' },
            },
            '企业通知系统': {
                contactList: { type: 'textarea', label: '员工通讯录（JSON格式）', placeholder: '[{"name":"张三","phone":"13800138000","dept":"技术部"}]', description: '员工信息JSON数组' },
                meetingTemplate: { type: 'textarea', label: '会议通知模板', placeholder: '您好{name}，{meetingTime}在{location}召开{meetingName}会议，请准时参加。', description: '会议通知模板，支持{name}、{meetingTime}等变量' },
                salaryTemplate: { type: 'textarea', label: '薪资通知模板', placeholder: '您好{name}，您的{month}月薪资已发放，请注意查收。', description: '薪资通知模板' },
                enableAttendanceReminder: { type: 'switch', label: '启用考勤提醒', default: true, description: '自动发送考勤异常提醒' },
            },
            '教育提醒系统': {
                studentList: { type: 'textarea', label: '学生信息（JSON格式）', placeholder: '[{"name":"小明","phone":"13800138000","parentPhone":"13900139000"}]', description: '学生及其家长联系方式' },
                homeworkTemplate: { type: 'textarea', label: '作业提醒模板', placeholder: '{parentName}您好，{studentName}今天的作业是：{homework}，请督促完成。', description: '作业提醒模板' },
                parentMeetingTemplate: { type: 'textarea', label: '家长会通知模板', placeholder: '{parentName}您好，{meetingTime}召开家长会，请准时参加。', description: '家长会通知模板' },
                scoreNotificationTemplate: { type: 'textarea', label: '成绩发布模板', placeholder: '{parentName}您好，{studentName}的{subject}成绩为：{score}分。', description: '成绩发布模板' },
            },
            '医疗健康助手': {
                patientList: { type: 'textarea', label: '患者信息（JSON格式）', placeholder: '[{"name":"张三","phone":"13800138000","medications":["阿司匹林"],"schedule":"08:00,20:00"}]', description: '患者及其用药信息' },
                medicationTemplate: { type: 'textarea', label: '服药提醒模板', placeholder: '{name}，该服用{medication}了，请按时服药。', description: '服药提醒模板' },
                appointmentTemplate: { type: 'textarea', label: '复诊预约模板', placeholder: '{name}，您的复诊时间为{appointmentTime}，请准时到达。', description: '复诊预约模板' },
                emergencyContacts: { type: 'textarea', label: '紧急联系人（每行一个号码）', placeholder: '13900139000\n13600136000', description: '紧急情况通知的联系人' },
            },
            '快递通知管家': {
                expressNumbers: { type: 'textarea', label: '快递单号列表（每行一个）', placeholder: 'SF1234567890\nYT9876543210', description: '待跟踪的快递单号' },
                recipientPhones: { type: 'textarea', label: '收件人手机号列表（每行一个）', placeholder: '13800138000\n13900139000', description: '接收快递通知的手机号码' },
                pickupTemplate: { type: 'textarea', label: '取件通知模板', placeholder: '您好，您的快递{expressNumber}已到达{location}，请及时取件。', description: '取件通知模板' },
                deliveredTemplate: { type: 'textarea', label: '签收确认模板', placeholder: '您好，您的快递{expressNumber}已签收，如有问题请联系我们。', description: '签收确认模板' },
            },
            '物业管理系统': {
                residentList: { type: 'textarea', label: '业主信息（JSON格式）', placeholder: '[{"name":"张三","phone":"13800138000","room":"1-101"}]', description: '业主信息JSON数组' },
                feeReminderTemplate: { type: 'textarea', label: '物业费催缴模板', placeholder: '{name}您好，您的{month}月物业费{amount}元尚未缴纳，请及时缴费。', description: '物业费催缴模板' },
                serviceTemplate: { type: 'textarea', label: '停水停电通知模板', placeholder: '{name}您好，{time}将进行{service}，请提前做好准备。', description: '停水停电通知模板' },
                emergencyTemplate: { type: 'textarea', label: '紧急事件广播模板', placeholder: '紧急通知：{event}，请各位业主{action}。', description: '紧急事件广播模板' },
            },
            '车辆服务提醒': {
                vehicleList: { type: 'textarea', label: '车辆信息（JSON格式）', placeholder: '[{"plate":"京A12345","owner":"张三","phone":"13800138000","insuranceDate":"2024-12-31"}]', description: '车辆及车主信息' },
                inspectionReminderDays: { type: 'input', label: '年检提前提醒天数', inputType: 'number', default: '30', description: '年检到期前多少天提醒' },
                insuranceReminderDays: { type: 'input', label: '保险提前提醒天数', inputType: 'number', default: '30', description: '保险到期前多少天提醒' },
                maintenanceReminderDays: { type: 'input', label: '保养提前提醒天数', inputType: 'number', default: '7', description: '保养到期前多少天提醒' },
            },
            // 智能应用
            '智能客服系统': {
                knowledgeBase: { type: 'textarea', label: '知识库（JSON格式）', placeholder: '[{"question":"如何查询余额","answer":"请发送YE到10086"}]', description: 'FAQ知识库JSON数组' },
                enableAutoRouting: { type: 'switch', label: '启用智能路由', default: true, description: '根据关键词自动路由到人工或自动回复' },
                routingKeywords: { type: 'textarea', label: '转人工关键词（每行一个）', placeholder: '人工\n客服\n投诉', description: '包含这些关键词时转人工客服' },
                satisfactionSurvey: { type: 'switch', label: '启用满意度调查', default: true, description: '对话结束后发送满意度调查' },
            },
            '语音验证码系统': {
                codeLength: { type: 'input', label: '验证码长度', inputType: 'number', default: '6', description: '生成的验证码位数' },
                codeExpire: { type: 'input', label: '验证码有效期（分钟）', inputType: 'number', default: '5', description: '验证码过期时间' },
                supportedLanguages: { type: 'textarea', label: '支持的语言（每行一个）', placeholder: 'zh-CN\nen-US', description: '支持的语言代码列表' },
                rateLimit: { type: 'input', label: '频率限制（次/分钟）', inputType: 'number', default: '3', description: '同一号码发送频率限制' },
            },
            '电话会议助理': {
                meetingTimeTemplate: { type: 'textarea', label: '会议邀请模板', placeholder: '您好，邀请您参加{meetingName}，时间：{meetingTime}，请按1确认参加，按2拒绝。', description: '会议邀请语音模板' },
                reminderMinutes: { type: 'input', label: '提前提醒分钟数', inputType: 'number', default: '15', description: '会议开始前多少分钟提醒' },
                summaryTemplate: { type: 'textarea', label: '会议纪要模板', placeholder: '会议{meetingName}已结束，纪要已发送到您的邮箱。', description: '会议纪要通知模板' },
            },
            '语音问卷调查': {
                questionnaire: { type: 'textarea', label: '问卷内容（JSON格式）', placeholder: '{"title":"满意度调查","questions":["您对我们的服务满意吗？按1满意，按2不满意"]}', description: '问卷JSON格式定义' },
                targetPhones: { type: 'textarea', label: '目标号码列表（每行一个）', placeholder: '13800138000\n13900139000', description: '接收问卷调查的号码' },
                callTime: { type: 'input', label: '拨打时间', inputType: 'time', default: '09:00', description: '开始拨打问卷电话的时间' },
            },
            '智能电话营销': {
                customerList: { type: 'textarea', label: '客户名单（JSON格式）', placeholder: '[{"name":"客户A","phone":"13800138000","level":"A"}]', description: '客户信息JSON数组' },
                scriptTemplate: { type: 'textarea', label: '话术脚本模板', placeholder: '您好{name}，我是{company}的{caller}，今天想向您介绍我们的{product}。', description: '电话营销话术模板' },
                enableAutoRecording: { type: 'switch', label: '自动记录通话', default: true, description: '自动记录拨打结果和客户意向' },
                interestLevels: { type: 'textarea', label: '意向等级关键词', placeholder: 'A级：非常感兴趣\nB级：一般\nC级：不感兴趣', description: '根据客户反应判断意向等级' },
            },
            '多语言翻译助手': {
                sourceLanguage: { type: 'select', label: '源语言', options: ['中文', '英文', '日文', '韩文'], default: '中文', description: '翻译源语言' },
                targetLanguage: { type: 'select', label: '目标语言', options: ['中文', '英文', '日文', '韩文'], default: '英文', description: '翻译目标语言' },
                enableRealTime: { type: 'switch', label: '实时翻译', default: true, description: '通话中实时翻译' },
            },
            // 趣味应用
            '情感陪伴机器人': {
                storyLibrary: { type: 'textarea', label: '故事库（每行一个故事标题）', placeholder: '小红帽\n三只小猪', description: '睡前故事列表' },
                greetingTemplate: { type: 'textarea', label: '早安问候模板', placeholder: '早上好，今天是{date}，天气{weather}，{quote}', description: '早安问候模板，支持{date}、{weather}、{quote}变量' },
                enableDailyGreeting: { type: 'switch', label: '启用每日问候', default: true, description: '每天定时发送问候' },
                greetingTime: { type: 'input', label: '问候时间', inputType: 'time', default: '08:00', description: '每日问候时间' },
            },
            '语音游戏中心': {
                enabledGames: { type: 'textarea', label: '启用的游戏（每行一个）', placeholder: '猜数字\n成语接龙', description: '可用的游戏列表' },
                maxPlayers: { type: 'input', label: '最大玩家数', inputType: 'number', default: '4', description: '多人游戏的最大参与人数' },
            },
            '语音日记本': {
                storageDays: { type: 'input', label: '保存天数', inputType: 'number', default: '365', description: '日记保存天数' },
                enableEmotionTag: { type: 'switch', label: '启用情绪标签', default: true, description: '自动分析并标记情绪' },
                enableMemoryReminder: { type: 'switch', label: '启用回忆提醒', default: true, description: '一年前的今天提醒' },
            },
            '语音闹钟系列': {
                alarms: { type: 'textarea', label: '闹钟列表（JSON格式）', placeholder: '[{"time":"07:00","name":"起床","volume":"渐进"}]', description: '闹钟JSON数组' },
                enableGradualVolume: { type: 'switch', label: '渐进音量', default: true, description: '音量逐渐增大' },
            },
            '语音祝福定制': {
                enableVoiceImitation: { type: 'switch', label: '启用声音模仿', default: false, description: 'AI合成特定声音' },
                backgroundMusic: { type: 'textarea', label: '背景音乐URL列表（每行一个）', placeholder: 'https://example.com/music1.mp3', description: '可选背景音乐' },
            },
            '语音抽奖系统': {
                prizeList: { type: 'textarea', label: '奖品列表（JSON格式）', placeholder: '[{"name":"一等奖","count":1},{"name":"二等奖","count":5}]', description: '奖品JSON数组' },
                participantPhones: { type: 'textarea', label: '参与者号码列表（每行一个）', placeholder: '13800138000\n13900139000', description: '参与抽奖的号码' },
                drawTime: { type: 'input', label: '抽奖时间', inputType: 'datetime-local', description: '抽奖开始时间' },
            },
            '语音读书会': {
                bookList: { type: 'textarea', label: '书籍列表（JSON格式）', placeholder: '[{"title":"三国演义","author":"罗贯中","chapters":120}]', description: '书籍JSON数组' },
                dailyReadTime: { type: 'input', label: '每日阅读时长（分钟）', inputType: 'number', default: '10', description: '每天播报的时长' },
                readTime: { type: 'input', label: '播报时间', inputType: 'time', default: '20:00', description: '每日播报时间' },
            },
            '语音天气管家': {
                targetPhones: { type: 'textarea', label: '接收号码列表（每行一个）', placeholder: '13800138000\n13900139000', description: '接收天气播报的号码' },
                reportTime: { type: 'input', label: '播报时间', inputType: 'time', default: '07:00', description: '每日天气播报时间' },
                enableWarning: { type: 'switch', label: '启用恶劣天气预警', default: true, description: '恶劣天气自动预警' },
                city: { type: 'input', label: '城市', default: '北京', description: '天气查询城市' },
            },
            // 实用工具
            '电话转移服务': {
                deviceChain: { type: 'textarea', label: '设备链（JSON格式）', placeholder: '[{"deviceId":"xxx","priority":1}]', description: '转接设备优先级链' },
                enableTimeBasedRouting: { type: 'switch', label: '启用时间路由', default: false, description: '根据时间自动路由' },
                enableLocationRouting: { type: 'switch', label: '启用位置路由', default: false, description: '根据位置自动路由' },
            },
            '语音备忘录': {
                maxRecordings: { type: 'input', label: '最大录音数', inputType: 'number', default: '100', description: '最多保存的录音数量' },
                autoCategoryEnabled: { type: 'switch', label: '自动分类', default: true, description: '根据内容自动分类' },
            },
            '电话号码检测': {
                checkTypes: { type: 'textarea', label: '检测类型（每行一个）', placeholder: '空号检测\n关机检测', description: '启用的检测类型' },
                resultTemplate: { type: 'textarea', label: '结果模板', placeholder: '号码{phone}检测结果：{result}', description: '检测结果通知模板' },
            },
            '通话录音取证': {
                enableRecording: { type: 'switch', label: '启用录音', default: true, description: '自动录音所有通话' },
                noticeVoice: { type: 'textarea', label: '提示音内容', placeholder: '本次通话将被录音', description: '录音前的提示音' },
                enableEncryption: { type: 'switch', label: '启用加密', default: true, description: '录音文件加密存储' },
            },
            '国际电话助手': {
                defaultTimezone: { type: 'input', label: '默认时区', default: '+08:00', description: '默认时区设置' },
                enableCostEstimation: { type: 'switch', label: '启用资费估算', default: true, description: '显示通话资费估算' },
            },
            // 系统工具
            '微信通知转发': {
                webhookUrl: { type: 'input', label: '企业微信Webhook URL', placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx', description: '企业微信机器人Webhook地址' },
                filterSender: { type: 'input', label: '过滤发送者（可选）', placeholder: '10086,10010', description: '仅转发指定发送者的短信，留空则转发所有' },
                enableKeywordFilter: { type: 'switch', label: '启用关键词过滤', default: false, description: '仅转发包含关键词的短信' },
                keywords: { type: 'textarea', label: '关键词列表（每行一个）', placeholder: '验证码\n余额', description: '转发关键词列表' },
            },
            '数据导出工具': {
                exportFormat: { type: 'select', label: '导出格式', options: ['CSV', 'Excel'], default: 'CSV', description: '数据导出格式' },
                defaultDateRange: { type: 'input', label: '默认日期范围（天）', inputType: 'number', default: '30', description: '默认导出的日期范围' },
            },
            '自动回复机器人': {
                keywords: { type: 'textarea', label: '关键词规则（JSON格式）', placeholder: '[{"keyword":"验证码","reply":"已收到您的验证码"}]', description: '关键词及回复JSON数组' },
                enableRegex: { type: 'switch', label: '启用正则表达式', default: false, description: '使用正则表达式匹配' },
                caseSensitive: { type: 'switch', label: '区分大小写', default: false, description: '关键词匹配是否区分大小写' },
            },
            '网络监控器': {
                signalThreshold: { type: 'input', label: '信号强度阈值（dBm）', inputType: 'number', default: '-100', description: '信号强度告警阈值' },
                disconnectAlertEnabled: { type: 'switch', label: '启用断线告警', default: true, description: '网络断开时发送告警' },
                chartDays: { type: 'input', label: '图表显示天数', inputType: 'number', default: '7', description: '信号强度图表显示的天数' },
            },
        };

        const specificConfig = appSpecificConfigs[appName] || {};
        const allConfigs = { ...commonConfigs, ...specificConfig };

        return Object.entries(allConfigs).map(([key, configDef]: [string, any]) => {
            const value = config[key] ?? configDef.default ?? '';
            
            if (configDef.type === 'switch') {
                return (
                    <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor={key}>{configDef.label}</Label>
                            <Switch
                                id={key}
                                checked={value}
                                onCheckedChange={(checked) => setConfig({ ...config, [key]: checked })}
                            />
                        </div>
                        {configDef.description && (
                            <p className="text-xs text-muted-foreground">{configDef.description}</p>
                        )}
                    </div>
                );
            }

            if (configDef.type === 'select') {
                return (
                    <div key={key} className="space-y-2">
                        <Label htmlFor={key}>{configDef.label}</Label>
                        <select
                            id={key}
                            className="flex h-10 w-full rounded-lg border border-input/60 bg-background px-3 py-2 text-sm"
                            value={value}
                            onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                        >
                            {configDef.options?.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        {configDef.description && (
                            <p className="text-xs text-muted-foreground">{configDef.description}</p>
                        )}
                    </div>
                );
            }

            if (configDef.type === 'textarea') {
                return (
                    <div key={key} className="space-y-2">
                        <Label htmlFor={key}>{configDef.label}</Label>
                        <Textarea
                            id={key}
                            value={value}
                            onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                            placeholder={configDef.placeholder}
                        />
                        {configDef.description && (
                            <p className="text-xs text-muted-foreground">{configDef.description}</p>
                        )}
                    </div>
                );
            }

            return (
                <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{configDef.label}</Label>
                    <Input
                        id={key}
                        type={configDef.inputType || configDef.type || 'text'}
                        value={value}
                        onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                        placeholder={configDef.placeholder}
                    />
                    {configDef.description && (
                        <p className="text-xs text-muted-foreground">{configDef.description}</p>
                    )}
                </div>
            );
        });
    };

    if (!app) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>配置 {app.name}</DialogTitle>
                    <DialogDescription>{app.description}</DialogDescription>
                </DialogHeader>
                
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">加载配置中...</span>
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        {renderConfigForm()}
                        {Object.keys(config).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                该应用暂无配置项，或配置项将根据应用类型自动生成
                            </p>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button onClick={handleSave} disabled={saving || loading}>
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        保存配置
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
