const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { getConfig, getEnvVars, updateConfig } = require('./config');

// 检查是否已启动（防止多实例）
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 如果已经有实例在运行，聚焦到现有窗口
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].focus();
    }
  });

  // 加载配置并设置环境变量
  const config = getConfig();
  const envVars = getEnvVars();

  // 在启动 Next.js 之前设置环境变量
  Object.assign(process.env, envVars);

  // 设置数据库路径
  process.env.DATABASE_URL = `file:${config.database.path}`;

  let mainWindow;
  let nextProcess = null;
  const isDev = process.env.NODE_ENV !== 'production';
  const PORT = config.app.port || 3000;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      icon: path.join(__dirname, '../public/icons/icon.png'), // 需要创建图标
      show: false, // 先不显示，等加载完成后再显示
    });

    // 窗口加载完成后显示
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      if (isDev) {
        mainWindow.webContents.openDevTools();
      }
    });

    // 启动 Next.js 服务器
    startNextServer();

    // 监听窗口关闭
    mainWindow.on('closed', () => {
      mainWindow = null;
      if (nextProcess) {
        nextProcess.kill();
        nextProcess = null;
      }
    });
  }

  function startNextServer() {
    if (nextProcess) {
      return; // 服务器已在运行
    }

    const appPath = app.getAppPath();
    const isProduction = !isDev;

    if (isProduction) {
      // 生产模式：运行打包后的 Next.js
      const nextPath = path.join(appPath, '.next', 'standalone');
      const serverPath = path.join(nextPath, 'server.js');
      
      // 设置环境变量
      const env = {
        ...process.env,
        ...getEnvVars(),
        PORT: PORT.toString(),
        NODE_ENV: 'production',
      };

      nextProcess = spawn('node', [serverPath], {
        cwd: nextPath,
        env: env,
        stdio: 'inherit',
      });
    } else {
      // 开发模式：运行 npm run dev
      nextProcess = spawn('npm', ['run', 'dev'], {
        cwd: appPath,
        env: {
          ...process.env,
          ...getEnvVars(),
          PORT: PORT.toString(),
        },
        shell: true,
        stdio: 'inherit',
      });
    }

    nextProcess.on('error', (error) => {
      console.error('Failed to start Next.js server:', error);
      dialog.showErrorBox('启动失败', `无法启动服务器: ${error.message}`);
    });

    nextProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error('Next.js server exited with code:', code);
      }
      nextProcess = null;
    });

    // 等待服务器启动
    setTimeout(() => {
      mainWindow.loadURL(`http://localhost:${PORT}`);
    }, 3000);
  }

  // IPC 处理程序 - 获取配置
  ipcMain.handle('get-config', () => {
    return getConfig();
  });

  // IPC 处理程序 - 更新配置
  ipcMain.handle('update-config', (event, section, key, value) => {
    updateConfig(section, key, value);
    // 重新加载环境变量
    const newEnvVars = getEnvVars();
    Object.assign(process.env, newEnvVars);
    
    // 通知渲染进程配置已更改
    if (mainWindow) {
      mainWindow.webContents.send('config-changed', getConfig());
    }
    
    return { success: true };
  });

  // IPC 处理程序 - 选择数据库文件
  ipcMain.handle('select-database-path', async () => {
    const currentConfig = getConfig();
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'createDirectory'],
      filters: [
        { name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      defaultPath: currentConfig.database.path,
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      updateConfig('database', 'path', selectedPath);
      process.env.DATABASE_URL = `file:${selectedPath}`;
      return { path: selectedPath };
    }
    return null;
  });

  // IPC 处理程序 - 获取版本信息
  ipcMain.handle('get-version', () => {
    return {
      version: app.getVersion(),
      name: app.getName(),
    };
  });

  // 窗口控制
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  // 应用事件
  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (nextProcess) {
      nextProcess.kill();
      nextProcess = null;
    }
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    if (nextProcess) {
      nextProcess.kill();
      nextProcess = null;
    }
  });
}
