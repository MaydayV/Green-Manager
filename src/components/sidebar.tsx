"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Radio, MessageSquare, Phone, Bell, CalendarClock, AppWindow, Code2, Sparkles, Users, FileText, Wifi, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { SignOutButton } from "@/components/sign-out-button"

const navigation = [
    { name: "仪表盘", href: "/", icon: LayoutDashboard },
    { name: "设备管理", href: "/devices", icon: Radio },
    { name: "设备分组", href: "/groups", icon: Users },
    { name: "WiFi管理", href: "/wifi", icon: Wifi },
    { name: "短信管理", href: "/messages", icon: MessageSquare },
    { name: "通话记录", href: "/calls", icon: Phone },
    { name: "告警中心", href: "/alerts", icon: Bell },
    { name: "自动化任务", href: "/tasks", icon: CalendarClock },
    { name: "应用中心", href: "/apps", icon: AppWindow },
    { name: "数据分析", href: "/reports", icon: FileText },
    { name: "审计日志", href: "/audit", icon: FileText },
    { name: "开放平台", href: "/developer", icon: Code2 },
    { name: "应用配置", href: "/config", icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="flex h-screen w-64 flex-col border-r bg-card/50 backdrop-blur-sm text-card-foreground shadow-premium">
            {/* Logo/Brand Section */}
            <div className="flex h-16 items-center border-b px-4 bg-gradient-to-r from-primary/5 to-purple-500/5">
                <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <div className="font-bold text-lg bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            Green Manager
                        </div>
                        <div className="text-xs text-muted-foreground">Device Management</div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                                isActive
                                    ? "bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary shadow-sm border-l-2 border-primary"
                                    : "text-muted-foreground hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-primary/10 hover:text-purple-400 dark:hover:text-purple-300 hover:translate-x-1 hover:border-l-2 hover:border-purple-500/50"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "mr-3 h-5 w-5 flex-shrink-0 transition-all",
                                    isActive 
                                        ? "text-primary scale-110" 
                                        : "text-muted-foreground group-hover:text-purple-400 dark:group-hover:text-purple-300 group-hover:scale-105"
                                )}
                            />
                            <span className={cn(
                                "transition-all",
                                isActive && "font-semibold"
                            )}>
                                {item.name}
                            </span>
                            {isActive && (
                                <div className="absolute right-2 h-2 w-2 rounded-full bg-primary pulse-glow" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="border-t p-4 space-y-3 bg-muted/30">
                <SignOutButton />
                <div className="flex items-center justify-between px-2">
                    <div className="text-xs text-muted-foreground">
                        v1.0.0 测试版
                    </div>
                    <div className="h-2 w-2 rounded-full bg-green-500 pulse-glow" />
                </div>
            </div>
        </div>
    )
}
