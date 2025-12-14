import { NextResponse } from 'next/server';

// 在 Electron 环境中，从主进程获取配置
// 在 Web 环境中，从环境变量或配置文件读取

export async function GET() {
  // 检查是否在 Electron 环境中
  const isElectron = typeof window !== 'undefined' && (window as any).electron;

  if (isElectron) {
    // Electron 环境：通过 IPC 获取配置
    // 注意：这需要在客户端调用，服务器端无法直接访问
    return NextResponse.json({
      error: 'This endpoint should be called from the client side in Electron mode',
    }, { status: 400 });
  }

  // Web 环境：从环境变量读取
  const config = {
    database: {
      path: process.env.DATABASE_URL?.replace('file:', '') || './dev.db',
    },
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
      BARK_DEVICE_KEY: process.env.BARK_DEVICE_KEY || '',
      BARK_BASE_URL: process.env.BARK_BASE_URL || 'https://api.day.app',
    },
    app: {
      port: parseInt(process.env.PORT || '3000', 10),
      autoStart: false,
    },
  };
  
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const config = await request.json();
  
  // 在 Electron 环境中，配置应该通过 IPC 保存
  // 在 Web 环境中，可以保存到文件或数据库
  
  // 这里只是示例，实际实现需要根据环境处理
  try {
    // 更新环境变量（仅当前进程）
    if (config.env) {
      Object.assign(process.env, config.env);
    }
    
    return NextResponse.json({ success: true, message: '配置已更新（仅当前会话有效）' });
  } catch (error: any) {
    return NextResponse.json(
      { error: '保存配置失败', details: error.message },
      { status: 500 }
    );
  }
}
