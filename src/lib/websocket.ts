// WebSocket实时更新客户端
// 注意：Next.js App Router不支持原生WebSocket，请使用SSE客户端 (sse-client.ts) 作为替代

export type WebSocketEventType =
    | 'device:online'
    | 'device:offline'
    | 'device:status:update'
    | 'sms:received'
    | 'sms:sent'
    | 'call:incoming'
    | 'call:ended'
    | 'alert:new'
    | 'alert:resolved'
    | 'command:executed';

export interface WebSocketEvent {
    type: WebSocketEventType;
    data: any;
    timestamp: string;
}

type EventHandler = (event: WebSocketEvent) => void;

class WebSocketClient {
    private ws: WebSocket | null = null;
    private handlers: Map<WebSocketEventType | '*', Set<EventHandler>> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private isConnecting = false;

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
            return;
        }

        this.isConnecting = true;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws`;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                try {
                    const wsEvent: WebSocketEvent = JSON.parse(event.data);
                    this.handleEvent(wsEvent);
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnecting = false;
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnecting = false;
                this.ws = null;
                this.attemptReconnect();
            };
        } catch (e) {
            console.error('Failed to create WebSocket:', e);
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
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            this.connect();
        }, delay);
    }

    private handleEvent(event: WebSocketEvent) {
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
        const wildcardHandlers = this.handlers.get('*' as WebSocketEventType);
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

    on(eventType: WebSocketEventType | '*', handler: EventHandler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
        }
        this.handlers.get(eventType)!.add(handler);

        // Auto-connect if not connected
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
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

    off(eventType: WebSocketEventType | '*', handler: EventHandler) {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.handlers.clear();
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Singleton instance
export const wsClient = new WebSocketClient();

// Auto-connect on module load (only in browser)
if (typeof window !== 'undefined') {
    wsClient.connect();
}

