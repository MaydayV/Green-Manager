const Store = require('electron-store');
const path = require('path');
const { app } = require('electron');

const store = new Store({
  name: 'green-manager-config',
  defaults: {
    // 数据库配置
    database: {
      path: path.join(app.getPath('userData'), 'green-manager.db'),
      // 或者使用自定义路径
      // path: path.join(app.getPath('documents'), 'GreenManager', 'data.db')
    },
    // 环境变量配置
    env: {
      NEXTAUTH_URL: 'http://localhost:3000',
      NEXTAUTH_SECRET: 'your-secret-key-change-in-production',
      BARK_DEVICE_KEY: '',
      BARK_BASE_URL: 'https://api.day.app',
    },
    // 应用配置
    app: {
      port: 3000,
      autoStart: false,
    }
  }
});

// 获取配置
function getConfig() {
  return {
    database: store.get('database'),
    env: store.get('env'),
    app: store.get('app'),
  };
}

// 更新配置
function updateConfig(section, key, value) {
  const current = store.get(section);
  store.set(`${section}.${key}`, value);
}

// 重置配置
function resetConfig() {
  store.clear();
}

// 导出配置为环境变量格式
function getEnvVars() {
  const config = getConfig();
  return {
    ...config.env,
    DATABASE_URL: `file:${config.database.path}`,
  };
}

module.exports = {
  getConfig,
  updateConfig,
  resetConfig,
  getEnvVars,
  store,
};
