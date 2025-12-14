// 客户端数据缓存工具

interface CacheItem<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

class DataCache {
    private cache: Map<string, CacheItem<any>> = new Map();
    private defaultTTL = 5 * 60 * 1000; // 5分钟默认过期时间

    set<T>(key: string, data: T, ttl?: number): void {
        const now = Date.now();
        const expiresAt = now + (ttl || this.defaultTTL);
        
        this.cache.set(key, {
            data,
            timestamp: now,
            expiresAt
        });
    }

    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }

        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return item.data as T;
    }

    has(key: string): boolean {
        const item = this.cache.get(key);
        if (!item) return false;
        
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    // 清理过期项
    cleanup(): void {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    // 获取缓存统计
    getStats() {
        const now = Date.now();
        let valid = 0;
        let expired = 0;

        for (const item of this.cache.values()) {
            if (now > item.expiresAt) {
                expired++;
            } else {
                valid++;
            }
        }

        return {
            total: this.cache.size,
            valid,
            expired
        };
    }
}

// 缓存键生成器
export const cacheKeys = {
    devices: () => 'devices:list',
    device: (id: string) => `device:${id}`,
    groups: () => 'groups:list',
    sms: (filters?: string) => `sms:list${filters ? `:${filters}` : ''}`,
    calls: (filters?: string) => `calls:list${filters ? `:${filters}` : ''}`,
    reports: (type: string, start?: string, end?: string) => 
        `reports:${type}${start ? `:${start}` : ''}${end ? `:${end}` : ''}`,
    templates: (type: 'wifi' | 'sms') => `${type}:templates`,
};

// 全局缓存实例
export const dataCache = new DataCache();

// 定期清理过期缓存（每10分钟）
if (typeof window !== 'undefined') {
    setInterval(() => {
        dataCache.cleanup();
    }, 10 * 60 * 1000);
}

// 带缓存的fetch包装器
export async function cachedFetch<T>(
    url: string,
    options?: RequestInit,
    cacheKey?: string,
    ttl?: number
): Promise<T> {
    const key = cacheKey || url;

    // 检查缓存
    const cached = dataCache.get<T>(key);
    if (cached !== null) {
        return cached;
    }

    // 从API获取
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // 存入缓存
        dataCache.set(key, data, ttl);
        
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

