import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // 路径
  getUserDocumentsPath: () => ipcRenderer.invoke('get-user-documents-path'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getGlobalResourcesPath: () => ipcRenderer.invoke('get-global-resources-path'),
  getProjectsPath: () => ipcRenderer.invoke('get-projects-path'),
  
  // 项目管理
  createProject: (projectPath: string) => ipcRenderer.invoke('create-project', projectPath),
  deleteProject: (projectPath: string) => ipcRenderer.invoke('delete-project', projectPath),
  copyProject: (srcPath: string, destPath: string) => ipcRenderer.invoke('copy-project', srcPath, destPath),
  createBackup: (targetPath: string) => ipcRenderer.invoke('create-backup', targetPath),
  
  // 文件操作
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('write-file', filePath, content),
  listDirectory: (dirPath: string) => ipcRenderer.invoke('list-directory', dirPath),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  fileExists: (filePath: string) => ipcRenderer.invoke('file-exists', filePath),
  getFileInfo: (filePath: string) => ipcRenderer.invoke('get-file-info', filePath),
  backupFile: (filePath: string) => ipcRenderer.invoke('backup-file', filePath),
  
  // 外部链接
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  // 设置存储
  storeGet: (key: string) => ipcRenderer.invoke('store-get', key),
  storeSet: (key: string, value: unknown) => ipcRenderer.invoke('store-set', key, value),
  
  // 全局资源
  initGlobalResources: (basePath: string) => ipcRenderer.invoke('init-global-resources', basePath),
  
  // 菜单事件
  onMenuNewProject: (callback: () => void) => {
    ipcRenderer.on('menu:new-project', callback);
    return () => ipcRenderer.removeListener('menu:new-project', callback);
  },
  onMenuOpenProject: (callback: () => void) => {
    ipcRenderer.on('menu:open-project', callback);
    return () => ipcRenderer.removeListener('menu:open-project', callback);
  },
  onMenuSave: (callback: () => void) => {
    ipcRenderer.on('menu:save', callback);
    return () => ipcRenderer.removeListener('menu:save', callback);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
