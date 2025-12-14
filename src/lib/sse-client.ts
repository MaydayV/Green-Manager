// Server-Sent Events (SSE) 客户端
// Next.js App Router不支持原生WebSocket，使用SSE作为替代方案

export type SSEEventType =
    | 'device:online'
    | 'device:offline'
    | 'device:status:update'
    | 'sms:received'
    | 'sms:sent'
    | 'call:incoming'
    | 'call:ended'
    | 'alert:new'
    | 'alert:resolved'
    | 'command:executed'
    | 'connected'
    | 'heartbeat';

export interface SSEEvent {
    type: SSEEventType;
    data: any;
    timestamp: string;
}

type EventHandler = (event: SSEEvent) => void;

class SSEClient {
    private eventSource: EventSource | null = null;
    private handlers: Map<SSEEventType | '*', Set<EventHandler>> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private isConnecting = false;

    connect() {
        if (this.eventSource?.readyState === EventSource.OPEN || this.isConnecting) {
            return;
        }

        this.isConnecting = true;
        const sseUrl = '/api/events';

        try {
            this.eventSource = new EventSource(sseUrl);

            this.eventSource.onopen = () => {
                console.log('SSE connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const sseEvent: SSEEvent = JSON.parse(event.data);
                    this.handleEvent(sseEvent);
                } catch (e) {
                    console.error('Failed to parse SSE message:', e);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('SSE error:', error);
                this.isConnecting = false;
                this.eventSource?.close();
                this.eventSource = null;
                this.attemptReconnect();
            };
        } catch (e) {
            console.error('Failed to create SSE connection:', e);
            this.isConnecting = false;
            this.attemptReconnect();
        }
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        setTimeout(() => {
            console.log(`Attempting to reconnect SSE (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            this.connect();
        }, delay);
    }

    private handleEvent(event: SSEEvent) {
        // 忽略心跳消息
        if (event.type === 'heartbeat') {
            return;
        }

        const handlers = this.handlers.get(event.type);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(event);
                } catch (e) {
                    console.error(`Error in event handler for ${event.type}:`, e);
                }
            });
        }

        // Also call handlers for wildcard '*'
        const wildcardHandlers = this.handlers.get('*' as SSEEventType);
        if (wildcardHandlers) {
            wildcardHandlers.forEach(handler => {
                try {
                    handler(event);
                } catch (e) {
                    console.error(`Error in wildcard event handler:`, e);
                }
            });
        }
    }

    on(eventType: SSEEventType | '*', handler: EventHandler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
        }
        this.handlers.get(eventType)!.add(handler);

        // Auto-connect if not connected
        if (!this.eventSource || this.eventSource.readyState !== EventSource.OPEN) {
            this.connect();
        }

        // Return unsubscribe function
        return () => {
            const handlers = this.handlers.get(eventType);
            if (handlers) {
                handlers.delete(handler);
            }
        };
    }

    off(eventType: SSEEventType | '*', handler: EventHandler) {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.handlers.clear();
    }

    isConnected(): boolean {
        return this.eventSource?.readyState === EventSource.OPEN;
    }
}

// Singleton instance
export const sseClient = new SSEClient();

// Auto-connect on module load (only in browser)
if (typeof window !== 'undefined') {
    sseClient.connect();
}

