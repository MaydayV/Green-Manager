
import Link from 'next/link';
import { UserNav } from '@/components/user-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';

export function Header() {
    return (
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4">
            {/* Breadcrumb or page title can go here if needed */}
            <div className="flex-1"></div>

            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/alerts">
                        <Bell className="h-5 w-5" />
                        <span className="sr-only">通知</span>
                    </Link>
                </Button>
                <ThemeToggle />
                <UserNav />
            </div>
        </header>
    );
}
