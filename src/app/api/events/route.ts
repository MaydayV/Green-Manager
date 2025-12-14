import { NextRequest } from 'next/server';
import { auth } from '@/auth';

// Server-Sent Events (SSE) implementation for real-time updates
// This is an alternative to WebSocket for Next.js App Router

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return new Response('Unauthorized', { status: 401 });
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            // Send initial connection message
            const send = (data: any) => {
                const message = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            send({ type: 'connected', message: 'SSE connection established' });

            // Keep connection alive with heartbeat
            const heartbeatInterval = setInterval(() => {
                send({ type: 'heartbeat', timestamp: new Date().toISOString() });
            }, 30000); // Every 30 seconds

            // Cleanup on client disconnect
            request.signal.addEventListener('abort', () => {
                clearInterval(heartbeatInterval);
                controller.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable buffering in nginx
        },
    });
}

