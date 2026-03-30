import { contextBridge, ipcRenderer } from 'electron';

export interface ZeroTokenProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiPath: string;
  loginUrl: string;
  models: {
    id: string;
    name: string;
    contextWindow: number;
    maxTokens: number;
    reasoning?: boolean;
  }[];
}

export interface ZeroTokenAuth {
  provider: string;
  cookie: string;
  userAgent: string;
  lastUpdate: string;
}

const electronAPI = {
  getUserDocumentsPath: () => ipcRenderer.invoke('get-user-documents-path'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getGlobalResourcesPath: () => ipcRenderer.invoke('get-global-resources-path'),
  getProjectsPath: () => ipcRenderer.invoke('get-projects-path'),
  
  createProject: (projectPath: string) => ipcRenderer.invoke('create-project', projectPath),
  deleteProject: (projectPath: string) => ipcRenderer.invoke('delete-project', projectPath),
  copyProject: (srcPath: string, destPath: string) => ipcRenderer.invoke('copy-project', srcPath, destPath),
  createBackup: (targetPath: string) => ipcRenderer.invoke('create-backup', targetPath),
  
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('write-file', filePath, content),
  listDirectory: (dirPath: string) => ipcRenderer.invoke('list-directory', dirPath),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  fileExists: (filePath: string) => ipcRenderer.invoke('file-exists', filePath),
  getFileInfo: (filePath: string) => ipcRenderer.invoke('get-file-info', filePath),
  backupFile: (filePath: string) => ipcRenderer.invoke('backup-file', filePath),
  
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  storeGet: (key: string) => ipcRenderer.invoke('store-get', key),
  storeSet: (key: string, value: unknown) => ipcRenderer.invoke('store-set', key, value),
  
  initGlobalResources: (basePath: string) => ipcRenderer.invoke('init-global-resources', basePath),
  
  zeroToken: {
    start: (port?: number) => ipcRenderer.invoke('zero-token:start', port),
    stop: () => ipcRenderer.invoke('zero-token:stop'),
    status: () => ipcRenderer.invoke('zero-token:status'),
    getProviders: () => ipcRenderer.invoke('zero-token:get-providers'),
    openLogin: (providerId: string) => ipcRenderer.invoke('zero-token:open-login', providerId),
    captureAuth: (providerId: string) => ipcRenderer.invoke('zero-token:capture-auth', providerId),
    captureFromChrome: (providerId: string) => ipcRenderer.invoke('zero-token:capture-from-chrome', providerId),
    getAuthStatus: () => ipcRenderer.invoke('zero-token:get-auth-status'),
    clearAuth: (providerId: string) => ipcRenderer.invoke('zero-token:clear-auth', providerId),
  },

  customApi: {
    proxy: (options: { endpoint: string; apiKey: string; body: any }) => 
      ipcRenderer.invoke('custom-api:proxy', options),
  },

  quality: {
    gateCheck: (options: { text: string; chapterNumber?: number }) => 
      ipcRenderer.invoke('quality:gate-check', options),
    aiTraceCheck: (options: { text: string }) => 
      ipcRenderer.invoke('quality:ai-trace-check', options),
    semanticCheck: (options: { text: string }) => 
      ipcRenderer.invoke('quality:semantic-check', options),
    wordCount: (options: { text: string }) => 
      ipcRenderer.invoke('quality:word-count', options),
  },

  blackboard: {
    create: (options: { projectPath: string; chapterNum: number; content: any }) => 
      ipcRenderer.invoke('blackboard:create', options),
    read: (options: { projectPath: string; chapterNum: number }) => 
      ipcRenderer.invoke('blackboard:read', options),
    update: (options: { projectPath: string; chapterNum: number; content: string }) => 
      ipcRenderer.invoke('blackboard:update', options),
  },

  truthFiles: {
    readAll: (options: { projectPath: string }) => 
      ipcRenderer.invoke('truthfiles:read-all', options),
    write: (options: { filePath: string; content: string }) => 
      ipcRenderer.invoke('truthfiles:write', options),
  },

  document: {
    integrityCheck: (options: { projectPath: string; chapterNum: number; step: string }) => 
      ipcRenderer.invoke('document:integrity-check', options),
  },

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
