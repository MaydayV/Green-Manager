const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露 Electron API 到渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 配置管理
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (section, key, value) => 
    ipcRenderer.invoke('update-config', section, key, value),
  selectDatabasePath: () => ipcRenderer.invoke('select-database-path'),
  
  // 应用信息
  getVersion: () => ipcRenderer.invoke('get-version'),
  getPlatform: () => process.platform,
  
  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // 事件监听
  on: (channel, callback) => {
    const validChannels = ['config-changed', 'window-state-changed'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  // 移除监听
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
});
