import { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, globalShortcut, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import Store from 'electron-store';

const store = new Store();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const DIST = path.join(__dirname, '../dist');
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

const GLOBAL_RESOURCES_DIR = 'NovelCreationKit/global_resources';
const PROJECTS_DIR = 'NovelCreationKit/projects';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    title: 'Novel Creation Kit',
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(DIST, 'index.html'));
  }

  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createMenu();
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建项目',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new-project'),
        },
        {
          label: '打开项目',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open-project'),
        },
        { type: 'separator' },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: '关于 Novel Creation Kit',
              message: 'Novel Creation Kit v1.0.0',
              detail: '基于 InkOS 设计的多智能体小说创作系统\n采用五层分层架构+双层学习体系',
            });
          },
        },
        {
          label: '文档',
          click: () => shell.openExternal('https://github.com'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/icon.svg');
  let icon: Electron.NativeImage;
  
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    icon = nativeImage.createEmpty();
  }
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);
  
  tray.setToolTip('Novel Creation Kit');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  
  globalShortcut.register('CmdOrCtrl+Shift+N', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// ============ IPC Handlers ============

// 获取用户文档目录
ipcMain.handle('get-user-documents-path', () => {
  return app.getPath('documents');
});

// 获取应用数据目录
ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

// 获取全局资源库路径
ipcMain.handle('get-global-resources-path', () => {
  const documentsPath = app.getPath('documents');
  return path.join(documentsPath, GLOBAL_RESOURCES_DIR);
});

// 获取项目根目录
ipcMain.handle('get-projects-path', () => {
  const documentsPath = app.getPath('documents');
  return path.join(documentsPath, PROJECTS_DIR);
});

// 创建项目目录结构
ipcMain.handle('create-project', async (_, projectPath: string) => {
  try {
    const dirs = [
      path.join(projectPath, 'truth_files'),
      path.join(projectPath, 'chapters'),
      path.join(projectPath, 'backups'),
      path.join(projectPath, '.project_settings'),
      path.join(projectPath, 'characters'),
      path.join(projectPath, 'synopsis'),
    ];
    
    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 创建默认 Truth Files
    const truthFiles = [
      { name: 'current_state.md', content: '# 当前世界状态\n\n## 时间线\n- 当前时间：\n\n## 主要地点\n- \n\n## 关键物品\n- \n' },
      { name: 'resource_ledger.md', content: '# 资源账本\n\n## 货币\n- 金币：0\n\n## 物品\n- \n\n## 属性\n- \n' },
      { name: 'pending_hooks.md', content: '# 待处理伏笔\n\n## 伏笔列表\n- \n\n## 回收记录\n- \n' },
      { name: 'chapter_summaries.md', content: '# 章节摘要\n\n## 章节进度\n\n### 第1章\n- 状态：\n- 核心事件：\n- 伏笔：\n- 角色：\n\n' },
      { name: 'subplot_board.md', content: '# 支线进度板\n\n## 支线列表\n\n### 支线1\n- 进度：\n- 状态：进行中\n- 下一步：\n\n' },
      { name: 'emotional_arcs.md', content: '# 情感弧线\n\n## 角色情感\n\n### 主角\n- 当前情感：\n- 变化轨迹：\n- 关键转折点：\n\n' },
      { name: 'character_matrix.md', content: '# 角色交互矩阵\n\n## 角色列表\n\n### 主角\n- 性别：\n- 年龄：\n- 身份：\n- 能力：\n- 性格：\n- 关系：\n\n## 交互记录\n\n' },
    ];
    
    for (const file of truthFiles) {
      const filePath = path.join(projectPath, 'truth_files', file.name);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, file.content, 'utf-8');
      }
    }
    
    // 创建默认项目专属设定
    const settingsPath = path.join(projectPath, '.project_settings', '项目专属设定规则.md');
    if (!fs.existsSync(settingsPath)) {
      fs.writeFileSync(settingsPath, '# 项目专属设定规则\n\n## 世界观设定\n\n## 人设规则\n\n## 特殊规则\n', 'utf-8');
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// 读取文件
ipcMain.handle('read-file', async (_, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '文件不存在' };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// 写入文件
ipcMain.handle('write-file', async (_, filePath: string, content: string) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// 列出目录
ipcMain.handle('list-directory', async (_, dirPath: string) => {
  try {
    if (!fs.existsSync(dirPath)) {
      return { success: true, entries: [] };
    }
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name),
    }));
    return { success: true, entries: result };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// 选择目录对话框
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: '选择目录',
  });
  
  if (result.canceled) {
    return { success: false, canceled: true };
  }
  
  return { success: true, path: result.filePaths[0] };
});

// 打开外部链接
ipcMain.handle('open-external', async (_, url: string) => {
  await shell.openExternal(url);
});

// 存储设置
ipcMain.handle('store-get', async (_, key: string) => {
  return store.get(key);
});

ipcMain.handle('store-set', async (_, key: string, value: unknown) => {
  store.set(key, value);
  return { success: true };
});

// 删除项目
ipcMain.handle('delete-project', async (_, projectPath: string) => {
  try {
    fs.rmSync(projectPath, { recursive: true, force: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// 备份文件
ipcMain.handle('backup-file', async (_, filePath: string) => {
  try {
    const backupDir = path.join(path.dirname(filePath), '.backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${timestamp}-${fileName}`);
    
    fs.copyFileSync(filePath, backupPath);
    return { success: true, backupPath };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// 创建备份
ipcMain.handle('create-backup', async (_, targetPath: string) => {
  try {
    const backupDir = path.join(targetPath, '.archive');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(backupDir, backupName);
    
    fs.mkdirSync(backupPath, { recursive: true });
    
    const items = fs.readdirSync(targetPath);
    for (const item of items) {
      if (item.startsWith('.')) continue;
      const src = path.join(targetPath, item);
      const dest = path.join(backupPath, item);
      fs.cpSync(src, dest, { recursive: true });
    }
    
    return { success: true, backupPath };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// 检查文件是否存在
ipcMain.handle('file-exists', async (_, filePath: string) => {
  return fs.existsSync(filePath);
});

// 获取文件信息
ipcMain.handle('get-file-info', async (_, filePath: string) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      success: true,
      info: {
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        isDirectory: stats.isDirectory(),
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// 初始化全局资源库目录
ipcMain.handle('init-global-resources', async (_, basePath: string) => {
  try {
    const globalPath = path.join(basePath, GLOBAL_RESOURCES_DIR);
    
    // 创建目录结构
    const dirs = [
      path.join(globalPath, 'public_learnings', '全类型通用学习库'),
      path.join(globalPath, 'public_learnings', '分类型专属学习库', '无限流小说'),
      path.join(globalPath, 'public_learnings', '分类型专属学习库', '玄幻小说'),
      path.join(globalPath, 'public_learnings', '分类型专属学习库', '都市小说'),
      path.join(globalPath, 'public_learnings', '分类型专属学习库', '科幻小说'),
      path.join(globalPath, 'public_learnings', '分类型专属学习库', '悬疑推理小说'),
      path.join(globalPath, 'public_templates'),
      path.join(globalPath, 'public_standards'),
      path.join(globalPath, 'public_writing_style'),
    ];
    
    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 创建默认通用规则文件
    const universalRulesPath = path.join(globalPath, 'public_learnings', '全类型通用学习库', 'universal_rules.json');
    if (!fs.existsSync(universalRulesPath)) {
      fs.writeFileSync(universalRulesPath, JSON.stringify({
        version: '1.0',
        rules: [
          { id: 'UR01', rule: '全平台通用强制规则1', severity: 'error' },
          { id: 'UR02', rule: '全平台通用强制规则2', severity: 'error' },
        ],
        updateAt: new Date().toISOString(),
      }, null, 2), 'utf-8');
    }
    
    return { success: true, globalPath };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// 全局异常处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('错误', `发生未知错误: ${error.message}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
