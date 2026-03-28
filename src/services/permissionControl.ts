import type { GlobalLearningResource, ProblemCase, BestPractice } from '../types';

export interface Permission {
  role: 'admin' | 'learning-agent' | 'agent' | 'project';
  actions: ('read' | 'write' | 'update' | 'delete' | 'approve')[];
}

export interface AccessLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resourcePath: string;
  result: 'success' | 'denied' | 'failed';
  reason?: string;
}

export interface ResourceVersion {
  versionId: string;
  timestamp: string;
  content: string;
  source: string;
  reason?: string;
}

class PermissionControl {
  private permissions: Map<string, Permission> = new Map();
  private accessLogs: AccessLog[] = [];
  private resourceVersions: Map<string, ResourceVersion[]> = new Map();

  constructor() {
    this.initializePermissions();
  }

  private initializePermissions(): void {
    // 创作总监：所有权限
    this.permissions.set('creative-director', {
      role: 'admin',
      actions: ['read', 'write', 'update', 'delete', 'approve'],
    });

    // 学习代理：全局资源更新申请（需创作总监审核）
    this.permissions.set('learning-agent', {
      role: 'learning-agent',
      actions: ['read', 'write', 'update'],
    });

    // 执行Agent：只读权限
    this.permissions.set('agent', {
      role: 'agent',
      actions: ['read'],
    });

    // 项目：只读权限
    this.permissions.set('project', {
      role: 'project',
      actions: ['read'],
    });
  }

  checkPermission(role: string, action: string, resourceType: 'global' | 'project'): { allowed: boolean; reason?: string } {
    const permission = this.permissions.get(role);

    if (!permission) {
      return { allowed: false, reason: '角色未授权' };
    }

    // 全局资源权限管控
    if (resourceType === 'global') {
      // 只有学习代理和创作总监可以写全局资源
      if (action !== 'read' && permission.role === 'agent') {
        return { allowed: false, reason: '执行Agent禁止修改全局资源' };
      }
      if (action !== 'read' && permission.role === 'project') {
        return { allowed: false, reason: '单项目禁止修改全局资源' };
      }
    }

    if (!permission.actions.includes(action as any)) {
      return { allowed: false, reason: `角色${role}无权执行${action}操作` };
    }

    return { allowed: true };
  }

  logAccess(log: Omit<AccessLog, 'id' | 'timestamp'>): void {
    this.accessLogs.push({
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    });

    // 只保留最近1000条日志
    if (this.accessLogs.length > 1000) {
      this.accessLogs = this.accessLogs.slice(-1000);
    }
  }

  getAccessLogs(resourcePath?: string): AccessLog[] {
    if (resourcePath) {
      return this.accessLogs.filter(log => log.resourcePath === resourcePath);
    }
    return [...this.accessLogs];
  }

  createVersion(resourcePath: string, content: string, source: string, reason?: string): ResourceVersion {
    const version: ResourceVersion = {
      versionId: `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      content,
      source,
      reason,
    };

    const versions = this.resourceVersions.get(resourcePath) || [];
    versions.push(version);
    this.resourceVersions.set(resourcePath, versions);

    return version;
  }

  getVersions(resourcePath: string): ResourceVersion[] {
    return this.resourceVersions.get(resourcePath) || [];
  }

  getLatestVersion(resourcePath: string): ResourceVersion | undefined {
    const versions = this.resourceVersions.get(resourcePath);
    return versions?.[versions.length - 1];
  }
}

export const permissionControl = new PermissionControl();

class RollbackManager {
  private backups: Map<string, { content: string; timestamp: string }[]> = new Map();
  private maxBackupsPerResource = 10;

  createBackup(resourcePath: string, content: string): void {
    const backups = this.backups.get(resourcePath) || [];
    backups.push({
      content,
      timestamp: new Date().toISOString(),
    });

    // 保留最近N个备份
    if (backups.length > this.maxBackupsPerResource) {
      backups.shift();
    }

    this.backups.set(resourcePath, backups);
  }

  rollback(resourcePath: string): { success: boolean; content?: string; error?: string } {
    const backups = this.backups.get(resourcePath);

    if (!backups || backups.length === 0) {
      return { success: false, error: '没有可用的备份' };
    }

    const latestBackup = backups[backups.length - 1];
    return { success: true, content: latestBackup.content };
  }

  getBackupHistory(resourcePath: string): { timestamp: string }[] {
    const backups = this.backups.get(resourcePath) || [];
    return backups.map(b => ({ timestamp: b.timestamp }));
  }

  canRollback(resourcePath: string): boolean {
    const backups = this.backups.get(resourcePath);
    return !!backups && backups.length > 0;
  }
}

export const rollbackManager = new RollbackManager();

class GlobalResourceManager {
  private globalResourcePath: string = '';

  setGlobalResourcePath(path: string): void {
    this.globalResourcePath = path;
  }

  getGlobalResourcePath(): string {
    return this.globalResourcePath;
  }

  async updateResource(
    resourcePath: string,
    newContent: string,
    source: string,
    reason?: string
  ): Promise<{ success: boolean; versionId?: string; error?: string }> {
    try {
      // 检查权限
      const permission = permissionControl.checkPermission('learning-agent', 'write', 'global');
      if (!permission.allowed) {
        permissionControl.logAccess({
          userId: 'learning-agent',
          action: 'update',
          resourcePath,
          result: 'denied',
          reason: permission.reason,
        });
        return { success: false, error: permission.reason };
      }

      // 读取当前内容创建备份
      let currentContent = '';
      if (window.electronAPI) {
        const result = await window.electronAPI.readFile(resourcePath);
        if (result.success && result.content) {
          currentContent = result.content;
        }
      }

      // 创建版本记录
      const version = permissionControl.createVersion(resourcePath, currentContent, source, reason);

      // 创建备份
      rollbackManager.createBackup(resourcePath, currentContent);

      // 写入新内容
      if (window.electronAPI) {
        const writeResult = await window.electronAPI.writeFile(resourcePath, newContent);
        if (!writeResult.success) {
          return { success: false, error: writeResult.error };
        }
      }

      // 记录访问日志
      permissionControl.logAccess({
        userId: 'learning-agent',
        action: 'update',
        resourcePath,
        result: 'success',
      });

      return { success: true, versionId: version.versionId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '更新失败' };
    }
  }

  async revertToVersion(
    resourcePath: string,
    versionId: string
  ): Promise<{ success: boolean; error?: string }> {
    const versions = permissionControl.getVersions(resourcePath);
    const targetVersion = versions.find(v => v.versionId === versionId);

    if (!targetVersion) {
      return { success: false, error: '版本不存在' };
    }

    // 检查权限
    const permission = permissionControl.checkPermission('creative-director', 'write', 'global');
    if (!permission.allowed) {
      return { success: false, error: permission.reason };
    }

    // 写入旧版本内容
    if (window.electronAPI) {
      const writeResult = await window.electronAPI.writeFile(resourcePath, targetVersion.content);
      if (!writeResult.success) {
        return { success: false, error: writeResult.error };
      }
    }

    // 记录访问日志
    permissionControl.logAccess({
      userId: 'creative-director',
      action: 'revert',
      resourcePath,
      result: 'success',
    });

    return { success: true };
  }
}

export const globalResourceManager = new GlobalResourceManager();
