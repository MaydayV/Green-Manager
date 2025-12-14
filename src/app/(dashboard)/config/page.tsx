'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, RefreshCw, FolderOpen, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

// 扩展 Window 接口以支持 Electron API
declare global {
  interface Window {
    electron?: {
      getConfig: () => Promise<any>;
      updateConfig: (section: string, key: string, value: any) => Promise<{ success: boolean }>;
      selectDatabasePath: () => Promise<{ path: string } | null>;
      getVersion: () => Promise<{ version: string; name: string }>;
      getPlatform: () => string;
    };
  }
}

export default function ConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    checkElectron();
    loadConfig();
  }, []);

  const checkElectron = () => {
    setIsElectron(typeof window !== 'undefined' && !!window.electron);
  };

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      if (isElectron && window.electron) {
        // Electron 环境：通过 IPC 获取配置
        const configData = await window.electron.getConfig();
        setConfig(configData);
      } else {
        // Web 环境：从 API 获取
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        } else {
          throw new Error('无法加载配置');
        }
      }
    } catch (e: any) {
      console.error('Failed to load config:', e);
      alert(`加载配置失败: ${e.message || '无法加载配置信息'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);

      if (isElectron && window.electron) {
        // Electron 环境：通过 IPC 更新配置
        await window.electron.updateConfig('database', 'path', config.database.path);
        await window.electron.updateConfig('env', 'NEXTAUTH_SECRET', config.env.NEXTAUTH_SECRET);
        await window.electron.updateConfig('env', 'BARK_DEVICE_KEY', config.env.BARK_DEVICE_KEY);
        await window.electron.updateConfig('env', 'BARK_BASE_URL', config.env.BARK_BASE_URL);
        await window.electron.updateConfig('app', 'port', config.app.port);

        alert('配置已保存，请重启应用使配置生效');
      } else {
        // Web 环境：通过 API 更新
        const res = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });

        if (res.ok) {
          alert('配置已保存（仅当前会话有效）');
        } else {
          throw new Error('保存失败');
        }
      }
    } catch (e: any) {
      console.error('Failed to save config:', e);
      alert(`保存配置失败: ${e.message || '无法保存配置'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectDatabase = async () => {
    if (!isElectron || !window.electron) {
      alert('文件选择功能仅在 Electron 环境中可用');
      return;
    }

    try {
      const result = await window.electron.selectDatabasePath();
      if (result) {
        setConfig({
          ...config,
          database: { ...config.database, path: result.path },
        });
        alert(`数据库路径已更新: ${result.path}`);
      }
    } catch (e: any) {
      console.error('Failed to select database path:', e);
      alert(`选择文件失败: ${e.message || '无法选择数据库文件'}`);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>无法加载配置</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="应用配置"
        description={isElectron 
          ? '配置将保存到本地，重启应用后生效' 
          : 'Web 模式下的配置仅对当前会话有效'}
      />

      {/* 数据库配置 */}
      <Card>
        <CardHeader>
          <CardTitle>数据库配置</CardTitle>
          <CardDescription>配置 SQLite 数据库文件路径</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="db-path">数据库路径</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="db-path"
                value={config.database.path}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    database: { ...config.database, path: e.target.value },
                  })
                }
                className="flex-1"
                placeholder="./green-manager.db"
              />
              {isElectron && (
                <Button
                  variant="outline"
                  onClick={handleSelectDatabase}
                  className="flex items-center gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  选择文件
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              数据库文件将存储在此路径
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* 环境变量配置 */}
      <Card>
        <CardHeader>
          <CardTitle>环境变量配置</CardTitle>
          <CardDescription>配置应用运行所需的环境变量</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nextauth-url">NEXTAUTH_URL</Label>
            <Input
              id="nextauth-url"
              value={config.env.NEXTAUTH_URL}
              onChange={(e) =>
                setConfig({
                  ...config,
                  env: { ...config.env, NEXTAUTH_URL: e.target.value },
                })
              }
              className="mt-2"
              placeholder="http://localhost:3000"
            />
            <p className="text-sm text-muted-foreground mt-1">
              应用的访问地址
            </p>
          </div>

          <div>
            <Label htmlFor="nextauth-secret">NEXTAUTH_SECRET</Label>
            <Input
              id="nextauth-secret"
              type="password"
              value={config.env.NEXTAUTH_SECRET}
              onChange={(e) =>
                setConfig({
                  ...config,
                  env: { ...config.env, NEXTAUTH_SECRET: e.target.value },
                })
              }
              className="mt-2"
              placeholder="your-secret-key"
            />
            <p className="text-sm text-muted-foreground mt-1">
              用于加密会话的密钥，请使用强密码
            </p>
          </div>

          <div>
            <Label htmlFor="bark-device-key">BARK_DEVICE_KEY</Label>
            <Input
              id="bark-device-key"
              value={config.env.BARK_DEVICE_KEY}
              onChange={(e) =>
                setConfig({
                  ...config,
                  env: { ...config.env, BARK_DEVICE_KEY: e.target.value },
                })
              }
              className="mt-2"
              placeholder="your-bark-device-key"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Bark 推送通知的设备密钥（可选）
            </p>
          </div>

          <div>
            <Label htmlFor="bark-base-url">BARK_BASE_URL</Label>
            <Input
              id="bark-base-url"
              value={config.env.BARK_BASE_URL}
              onChange={(e) =>
                setConfig({
                  ...config,
                  env: { ...config.env, BARK_BASE_URL: e.target.value },
                })
              }
              className="mt-2"
              placeholder="https://api.day.app"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Bark 推送服务的 API 地址
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* 应用配置 */}
      <Card>
        <CardHeader>
          <CardTitle>应用配置</CardTitle>
          <CardDescription>配置应用运行参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="app-port">服务端口</Label>
            <Input
              id="app-port"
              type="number"
              value={config.app.port}
              onChange={(e) =>
                setConfig({
                  ...config,
                  app: { ...config.app, port: parseInt(e.target.value, 10) || 3000 },
                })
              }
              className="mt-2"
              min={1024}
              max={65535}
            />
            <p className="text-sm text-muted-foreground mt-1">
              应用运行的端口号（默认: 3000）
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={loadConfig}
          disabled={saving}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          重新加载
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              保存配置
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
