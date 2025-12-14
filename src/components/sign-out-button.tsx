import { LogOut } from 'lucide-react';
import { signOutAction } from '@/lib/actions';

export function SignOutButton() {
    return (
        <form action={signOutAction}>
            <button className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
                退出登录
            </button>
        </form>
    );
}
