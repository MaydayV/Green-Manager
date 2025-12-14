import { useState, useCallback } from 'react';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toast, setToast] = useState<ToastOptions | null>(null);

  const showToast = useCallback((options: ToastOptions) => {
    setToast(options);
    
    // 显示浏览器原生通知或 alert
    if (options.variant === 'destructive') {
      alert(`${options.title}\n${options.description || ''}`);
    } else {
      // 可以使用更优雅的方式，这里先用 alert
      if (options.description) {
        alert(`${options.title}\n${options.description}`);
      } else {
        alert(options.title);
      }
    }

    // 3秒后清除
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  return {
    toast: showToast,
    currentToast: toast,
  };
}
