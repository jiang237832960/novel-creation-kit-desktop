import { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, globalShortcut, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import Store from 'electron-store';
import { createZeroTokenServer, getZeroTokenServer } from './zeroToken';

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
      path.join(projectPath, '.archive'),
    ];
    
    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 创建默认 Truth Files (7个)
    const truthFiles = [
      { name: 'current_state.md', content: `# 当前世界状态

## 时间线
- 当前时间：
- 时间节点：

## 主要地点
-

## 关键物品
-

## 重要状态
- 主角状态：
- 关键NPC状态：
` },
      { name: 'resource_ledger.md', content: `# 资源账本

## 货币
- 金币：
- 银币：

## 物品
| 物品名 | 数量 | 属性 | 备注 |
|-------|-----|-----|------|

## 属性
| 属性名 | 当前值 | 说明 |
|------|-------|-----|
` },
      { name: 'pending_hooks.md', content: `# 待处理伏笔

## 伏笔列表
| 伏笔内容 | 铺设章节 | 预期回收 | 状态 |
|---------|---------|---------|------|

## 回收记录
| 伏笔 | 回收章节 | 回收方式 | 效果 |
|-----|---------|---------|-----|
` },
      { name: 'chapter_summaries.md', content: `# 章节摘要

## 章节进度

### 第1章
- 状态：待创作
- 核心事件：
- 铺设伏笔：
- 主要角色：
- 字数：
` },
      { name: 'subplot_board.md', content: `# 支线进度板

## 支线任务

### 支线1
- 任务名称：
- 当前进度：
- 状态：进行中/已完成/已放弃
- 下一步目标：

## 支线奖励
| 支线 | 奖励内容 | 状态 |
|-----|---------|------|
` },
      { name: 'emotional_arcs.md', content: `# 情感弧线

## 角色情感

### 主角
- 当前情感状态：
- 情感起点：
- 当前阶段：
- 关键转折点：

### 其他角色
| 角色 | 与主角关系 | 当前情感 | 变化趋势 |
|-----|----------|---------|---------|
` },
      { name: 'character_matrix.md', content: `# 角色交互矩阵

## 角色列表

### 主角
- 姓名：
- 性别：
- 年龄：
- 身份：
- 能力：
- 性格：
- 与其他角色关系：

## 配角
| 角色名 | 身份 | 能力 | 与主角关系 | 作用 |
|-------|-----|-----|----------|-----|
` },
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
      fs.writeFileSync(settingsPath, `# 项目专属设定规则

## 世界观设定
- 背景时代：
- 世界规则：
- 力量体系：

## 人设规则
- 主角人设：
- 配角设定：

## 特殊规则
- 本书禁忌：
- 必须遵守：
`, 'utf-8');
    }

    // 创建人物设定表
    const characterPath = path.join(projectPath, 'characters', '人物设定表.md');
    if (!fs.existsSync(characterPath)) {
      fs.writeFileSync(characterPath, `# 人物设定表

## 主要角色

### 角色1
- 姓名：
- 性别：
- 年龄：
- 身份：
- 外貌：
- 性格：
- 能力/特长：
- 背景故事：
- 口头禅：

## 配角设定
| 角色名 | 定位 | 性格 | 作用 |
|-------|-----|-----|-----|
`, 'utf-8');
    }

    // 创建人物状态追踪表
    const characterTrackPath = path.join(projectPath, 'characters', '人物状态追踪表.md');
    if (!fs.existsSync(characterTrackPath)) {
      fs.writeFileSync(characterTrackPath, `# 人物状态追踪表

## 角色状态变更记录

### 主角状态
| 时间点/章节 | 状态变更 | 原因 | 影响 |
|-----------|---------|-----|-----|
`, 'utf-8');
    }

    // 创建网文配角管理表
    const supportingPath = path.join(projectPath, 'characters', '网文配角管理表.md');
    if (!fs.existsSync(supportingPath)) {
      fs.writeFileSync(supportingPath, `# 网文配角管理表

## 工具人配角
| 角色名 | 类型 | 作用 | 出场章节 | 退场节点 | 备注 |
|-------|-----|-----|---------|---------|-----|
| 店小二 | 信息提供者 | 提供任务线索 | 第3章 | - | 完成后自动退场 |
| 富二代 | 被打脸对象 | 制造冲突 | 第5-8章 | 第8章退场 | 典型霸总 |

## 反派配角
| 角色名 | 身份 | 能力 | 与主角冲突 | 结局 |
|-------|-----|-----|----------|-----|
`, 'utf-8');
    }

    // 创建章节细纲目录和网文爽点钩子表
    const synopsisDir = path.join(projectPath, 'synopsis');
    fs.mkdirSync(synopsisDir, { recursive: true });
    
    const shuangdianPath = path.join(projectPath, 'synopsis', '网文爽点钩子表.md');
    if (!fs.existsSync(shuangdianPath)) {
      fs.writeFileSync(shuangdianPath, `# 网文爽点钩子表

## 章节爽点规划

| 章节 | 爽点类型 | 位置 | 具体设计 | 效果 |
|-----|---------|-----|---------|-----|
| 第1章 | 开头钩子 | 前200字 | | |
| 第1章 | 小爽点 | 中段 | | |
| 第1章 | 结尾留坑 | 末尾 | | |

## 钩子设计
| 章节 | 钩子类型 | 内容 |
|-----|---------|-----|
`, 'utf-8');
    }

    // 创建伏笔追踪表
    const futiPath = path.join(projectPath, '伏笔追踪表.md');
    if (!fs.existsSync(futiPath)) {
      fs.writeFileSync(futiPath, `# 伏笔追踪表

## 伏笔记录

| 伏笔名称 | 类型 | 铺设章节 | 铺设位置 | 预期回收 | 回收章节 | 状态 |
|---------|-----|---------|---------|---------|---------|-----|
`, 'utf-8');
    }

    // 创建剧情脉络表
    const plotPath = path.join(projectPath, '剧情脉络表.md');
    if (!fs.existsSync(plotPath)) {
      fs.writeFileSync(plotPath, `# 剧情脉络表

## 核心剧情节点

| 节点 | 章节范围 | 核心事件 | 目的 | 状态 |
|-----|---------|---------|-----|-----|
| 开局 | 1-10章 | | 建立世界观 | |
| 冲突 | 11-30章 | | 制造矛盾 | |
| 高潮 | 31-50章 | | 全面爆发 | |
| 结局 | 51-60章 | | 收尾 | |

## 逻辑关联
- 事件A → 事件B：
- 事件B → 事件C：
`, 'utf-8');
    }

    // 创建设定变更记录
    const settingChangePath = path.join(projectPath, '设定变更记录.md');
    if (!fs.existsSync(settingChangePath)) {
      fs.writeFileSync(settingChangePath, `# 设定变更记录

## 变更记录

| 日期 | 变更内容 | 原设定 | 新设定 | 变更原因 |
|-----|---------|-------|-------|---------|
`, 'utf-8');
    }

    // 创建网文更新计划表
    const updatePlanPath = path.join(projectPath, '网文更新计划表.md');
    if (!fs.existsSync(updatePlanPath)) {
      fs.writeFileSync(updatePlanPath, `# 网文更新计划表

## 更新计划

| 日期 | 章节 | 字数目标 | 实际字数 | 完成状态 | 备注 |
|-----|-----|---------|---------|---------|-----|
| | | | | | |

## 断更应急
- 存稿数量：
- 应急方案：
- 恢复计划：

## 更新数据分析
- 总字数：
- 日均更新：
- 追读率：
`, 'utf-8');
    }

    // 创建创意方案
    const creativeSchemePath = path.join(projectPath, 'creative_scheme.md');
    if (!fs.existsSync(creativeSchemePath)) {
      fs.writeFileSync(creativeSchemePath, `# 创意方案

## 项目类型
-

## 核心创意
-

## 卖点分析
-

## 目标读者
-
`, 'utf-8');
    }

    // 创建世界观设定
    const worldSettingPath = path.join(projectPath, 'world_setting.md');
    if (!fs.existsSync(worldSettingPath)) {
      fs.writeFileSync(worldSettingPath, `# 世界观设定

## 世界背景
-

## 力量体系
-

## 社会结构
-

## 规则与禁忌
-
`, 'utf-8');
    }

    // 创建大纲
    const outlinePath = path.join(projectPath, 'outline.md');
    if (!fs.existsSync(outlinePath)) {
      fs.writeFileSync(outlinePath, `# 大纲

## 主线剧情
-

## 支线剧情
-

## 伏笔设计
-

## 结局设计
-
`, 'utf-8');
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
      // 全局类型化学习库
      path.join(globalPath, 'public_learnings', '全类型通用学习库'),
      path.join(globalPath, 'public_learnings', '分类型专属学习库', '无限流小说', '用户偏好画像库'),
      path.join(globalPath, 'public_learnings', '分类型专属学习库', '玄幻小说', '用户偏好画像库'),
      path.join(globalPath, 'public_learnings', '分类型专属学习库', '都市小说', '用户偏好画像库'),
      path.join(globalPath, 'public_learnings', '分类型专属学习库', '科幻小说', '用户偏好画像库'),
      path.join(globalPath, 'public_learnings', '分类型专属学习库', '悬疑推理小说', '用户偏好画像库'),
      path.join(globalPath, 'public_learnings', '分类型专属学习库', '其他类型小说', '用户偏好画像库'),
      // 网文专属补充库
      path.join(globalPath, 'public_learnings', '分类型专属学习库', '网文专属补充库'),
      // 公共模板库
      path.join(globalPath, 'public_templates', '网文专属模板'),
      // 公共规范库
      path.join(globalPath, 'public_standards'),
      // 公共文风库
      path.join(globalPath, 'public_writing_style', '网文文风规范'),
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
          { id: 'UR01', rule: '禁止"不是……而是……"句式', severity: 'error' },
          { id: 'UR02', rule: '禁止破折号"——"', severity: 'error' },
          { id: 'UR03', rule: '禁止元叙事（作者、读者、本书等）', severity: 'error' },
          { id: 'UR04', rule: '禁止报告术语（根据、统计、表明等）', severity: 'error' },
          { id: 'UR05', rule: '禁止作者说教词（必须、应该等）', severity: 'warning' },
          { id: 'UR06', rule: '禁止集体反应套话（众人、大家等）', severity: 'warning' },
          { id: 'UR07', rule: '禁止连续4句"了"字结尾', severity: 'warning' },
          { id: 'UR08', rule: '段落长度 ≤ 300字', severity: 'warning' },
        ],
        updateAt: new Date().toISOString(),
      }, null, 2), 'utf-8');
    }

    // 创建通用合规性规范
    const compliancePath = path.join(globalPath, 'public_learnings', '全类型通用学习库', '通用合规性规范.md');
    if (!fs.existsSync(compliancePath)) {
      fs.writeFileSync(compliancePath, `# 通用合规性规范

## 全平台通用内容红线

### 1. 政治敏感内容
- 禁止涉及国家领导人、历史敏感事件
- 禁止涉及政治制度比较
- 禁止涉及领土主权争议

### 2. 违法违规内容
- 禁止赌博描写
- 禁止毒品相关描写
- 禁止暴力血腥过度描写
- 禁止色情低俗内容

### 3. 版权问题
- 禁止抄袭他人作品
- 禁止使用未授权的音乐、影视作品名称

## 合规技能标准

1. **内容自检**：每次创作完成后进行合规自检
2. **敏感词过滤**：建立敏感词库进行过滤
3. **案例参考**：遇到不确定内容时参考合规案例库
`, 'utf-8');
    }

    // 创建通用格式规范
    const formatPath = path.join(globalPath, 'public_learnings', '全类型通用学习库', '通用格式规范.md');
    if (!fs.existsSync(formatPath)) {
      fs.writeFileSync(formatPath, `# 通用格式规范

## 章节格式标准

### 章节标题
- 格式：第X章 标题
- 示例：第1章 觉醒

### 正文字数
- 单章节建议字数：2000-3000字
- 最低字数：1500字
- 最高字数：5000字

### 段落格式
- 每段不超过300字
- 段落之间空一行
- 对话使用「」或""

## 标点符号使用

1. 禁用破折号"——"，使用逗号或其他标点替代
2. 禁止使用"不是……而是……"句式
3. 省略号使用"……"

## 敏感内容格式

- 涉及敏感话题用"XXX"替代
- 脏话用"*"替代
`, 'utf-8');
    }

    // 创建通用问题案例库
    const problemPath = path.join(globalPath, 'public_learnings', '全类型通用学习库', '通用问题案例库.md');
    if (!fs.existsSync(problemPath)) {
      fs.writeFileSync(problemPath, `# 通用问题案例库

## 高频问题汇总

### 1. 元叙事问题
- **问题描述**：使用"作者"、"读者"、"本书"等词汇
- **出现频次**：高频
- **根因**：习惯性使用第一人称视角
- **解决方案**：改为第三人称沉浸式写作

### 2. AI痕迹问题
- **问题描述**：段落长度过于均匀、句式单一
- **出现频次**：高频
- **根因**：AI生成特征明显
- **解决方案**：增加句式变化、段落长度变化

### 3. 词汇疲劳问题
- **问题描述**：高频词重复使用（突然、然后、于是）
- **出现频次**：高频
- **根因**：词汇量不足
- **解决方案**：建立同义词库替换

## 问题统计

| 问题类型 | 出现频次 | 严重程度 |
|---------|---------|---------|
| 元叙事 | 523 | 高 |
| 词汇疲劳 | 489 | 中 |
| 句式单一 | 356 | 中 |
| 标点错误 | 234 | 低 |
`, 'utf-8');
    }

    // 创建通用预防方案库
    const preventionPath = path.join(globalPath, 'public_learnings', '全类型通用学习库', '通用预防方案库.md');
    if (!fs.existsSync(preventionPath)) {
      fs.writeFileSync(preventionPath, `# 通用预防方案库

## 问题前置预防措施

### 1. 元叙事预防
- 写作时保持第三人称视角
- 避免使用"我们可以看到"等过渡句
- 让角色通过行动展示而非直接叙述

### 2. AI痕迹预防
- 故意变化句子长度
- 使用多样化的句式开头
- 避免使用AI常用连接词（首先、其次、然后、最后）

### 3. 词汇疲劳预防
- 建立个人词汇替换表
- 使用同义词工具辅助
- 多读优秀作品积累表达

### 4. 逻辑矛盾预防
- 建立人物设定表追踪
- 记录关键物品属性
- 标注时间线节点
`, 'utf-8');
    }

    // 创建通用创作最佳实践
    const practicePath = path.join(globalPath, 'public_learnings', '全类型通用学习库', '通用创作最佳实践.md');
    if (!fs.existsSync(practicePath)) {
      fs.writeFileSync(practicePath, `# 通用创作最佳实践

## 写作方法论

### 1. 开篇技巧
- 使用悬念或冲突开场
- 快速建立场景氛围
- 尽早引入主角

### 2. 情节推进
- 每个章节至少有一个新的信息点
- 保持情节紧张感
- 适时埋下伏笔

### 3. 角色塑造
- 通过对话展示性格
- 通过行动展示动机
- 保持角色一致性

### 4. 结尾技巧
- 留下悬念
- 制造冲突
- 引发好奇

## 网文创作专项

### 节奏把控
- 开头200字必须抓住读者
- 每800字一个小高潮
- 每章至少一个爽点

### 对话技巧
- 对话不超过3行
- 避免长篇独白
- 用对话推进情节
`, 'utf-8');
    }

    // 创建网文爽点库
    const shuangdianPath = path.join(globalPath, 'public_learnings', '分类型专属学习库', '网文专属补充库', '网文爽点库.md');
    if (!fs.existsSync(shuangdianPath)) {
      fs.writeFileSync(shuangdianPath, `# 网文爽点库

## 爽点类型

### 1. 逆袭爽点
- 废柴逆袭
- 被打脸后反杀
- 隐藏实力曝光

### 2. 升级爽点
- 等级突破
- 获得稀有装备/技能
- 实力碾压对手

### 3. 情感爽点
- 英雄救美
- 甜蜜互动
- 告白/确认关系

### 4. 复仇爽点
- 冤屈昭雪
- 敌人下场凄惨
- 因果报应

### 5. 智斗爽点
- 布局成功
- 识破阴谋
- 反转胜利

## 爽点触发场景

| 爽点类型 | 触发场景 | 效果强度 |
|---------|---------|---------|
| 打脸 | 当众展示实力 | 强 |
| 逆袭 | 绝境中突破 | 强 |
| 升级 | 突破关键等级 | 中 |
| 情感 | 甜蜜互动 | 中 |
| 复仇 | 仇人倒霉 | 强 |

## 爽点密度标准

- 每章至少1个核心爽点
- 每2000字一个小爽点
- 保持爽点连贯性，避免断档
`, 'utf-8');
    }

    // 创建网文节奏标准
    const rhythmPath = path.join(globalPath, 'public_learnings', '分类型专属学习库', '网文专属补充库', '网文节奏标准.md');
    if (!fs.existsSync(rhythmPath)) {
      fs.writeFileSync(rhythmPath, `# 网文节奏标准

## 章节节奏

### 开头钩子
- 位置：章节前200字
- 类型：悬念/冲突/金手指展示
- 要求：必须立刻抓住读者

### 中间爽点
- 位置：章节中段
- 类型：小高潮/反转/升级
- 要求：保持节奏紧凑

### 结尾留坑
- 位置：章节末尾
- 类型：悬念/危机/伏笔回收
- 要求：让读者想读下一章

## 节奏模式

### 无线流节奏
- 主线推进快
- 副本紧凑
- 升级稳定

### 都市流节奏
- 日常与冲突交替
- 情感线推进
- 装逼打脸频繁

### 玄幻流节奏
- 升级为主线
- 战斗场面多
- 世界观宏大

## 字数节奏

- 黄金400字：一个小高潮
- 1500字：一个小节点
- 3000字：一个完整章节
`, 'utf-8');
    }

    // 创建网文人设模板
    const personaPath = path.join(globalPath, 'public_learnings', '分类型专属学习库', '网文专属补充库', '网文人设模板.md');
    if (!fs.existsSync(personaPath)) {
      fs.writeFileSync(personaPath, '# 网文人设模板\n\n## 热门人设类型\n\n### 1. 霸总人设\n- 外冷内热\n- 表面高冷实则宠溺\n- 身份尊贵实力强大\n- 口嫌体正直\n\n### 2. 废柴逆袭人设\n- 开局弱势\n- 隐藏天赋/身份\n- 坚韧不拔\n- 不断打脸\n\n### 3. 高冷人设\n- 话少面瘫\n- 实力强横\n- 对主角例外\n- 傲娇属性\n\n### 4. 暖男人设\n- 温柔体贴\n- 善解人意\n- 默默付出\n- 中央空调（慎用）\n\n## 人设组成要素\n\n模板：\n姓名：\n年龄：\n外貌：\n性格：\n背景：\n能力/天赋：\n口头禅：\n弱点：\n人物弧光：\n\n## 配角工具人设定\n\n### 功能型配角\n- 提供信息\n- 推动剧情\n- 制造冲突\n\n### 反派型配角\n- 与主角对立\n- 制造障碍\n- 最终被打脸\n', 'utf-8');
    }

    // 创建网文更新规范
    const updatePath = path.join(globalPath, 'public_learnings', '分类型专属学习库', '网文专属补充库', '网文更新规范.md');
    if (!fs.existsSync(updatePath)) {
      fs.writeFileSync(updatePath, `# 网文更新规范

## 更新节奏标准

### 日更作者
- 每日更新：2000-4000字
- 最佳更新时间：18:00-22:00
- 保持规律更新

### 周更作者
- 每周更新：8000-15000字
- 固定更新日
- 保持质量

### 爆更作者
- 存稿充足时爆更
- 特殊日期加更
- 注意均订变化

## 断更应急方案

### 提前预警
- 更新请假条
- 说明恢复时间
- 保持读者信任

### 存稿管理
- 保持2万字存稿
- 紧急情况用存稿
- 后续补更计划

## 更新数据追踪

| 日期 | 字数 | 新增追读 | 评论 |
|-----|-----|---------|-----|
| | | | |
`, 'utf-8');
    }

    // 创建网文读者偏好库
    const readerPrefPath = path.join(globalPath, 'public_learnings', '分类型专属学习库', '网文专属补充库', '网文读者偏好库.md');
    if (!fs.existsSync(readerPrefPath)) {
      fs.writeFileSync(readerPrefPath, `# 网文读者偏好库

## 读者雷点

### 绝对雷区
- 绿帽/女主不洁
- 圣母主角
- 无脑反派
- 灌水凑字

### 相对雷区
- 更新太慢
- 错别字多
- 逻辑不通
- 主角太憋屈

## 读者爽点

### 高响应爽点
- 打脸情节
- 实力碾压
- 逆袭反转
- 甜蜜恋爱

### 中响应爽点
- 升级突破
- 获得宝物
- 身份曝光
- 扮猪吃虎

## 读者互动需求

### 评论互动
- 回复读者评论
- 采纳合理建议
- 调节读者情绪

### 剧情互动
- 投票选择剧情
- 角色命名
- 番外征集
`, 'utf-8');
    }

    // 创建网文文风规范
    const stylePath = path.join(globalPath, 'public_writing_style', '网文文风规范', '网文文风指南.md');
    if (!fs.existsSync(stylePath)) {
      fs.writeFileSync(stylePath, `# 网文文风指南

## 网文语言特点

### 1. 口语化
- 简洁明了
- 避免书面语
- 对话自然

### 2. 短句节奏
- 多用短句
- 增强节奏感
- 便于阅读

### 3. 情绪渲染
- 强化情绪词
- 善用感叹号
- 制造代入感

## 禁止使用

- "不是...而是..."
- 破折号"——"
- AI常用套话

## 推荐句式

- "xxx，却..."（转折）
- "xxx，甚至..."（递进）
- "xxx，尤其..."（强调）
`, 'utf-8');
    }

    // 创建各类型专属规则文件
    const novelTypes = ['无限流小说', '玄幻小说', '都市小说', '科幻小说', '悬疑推理小说', '其他类型小说'];
    
    for (const typeName of novelTypes) {
      const typePath = path.join(globalPath, 'public_learnings', '分类型专属学习库', typeName);
      
      // 类型专属规则.json
      const rulesPath = path.join(typePath, '类型专属规则.json');
      if (!fs.existsSync(rulesPath)) {
        fs.writeFileSync(rulesPath, JSON.stringify({
          version: '1.0',
          type: typeName,
          rules: [
            { id: `${typeName.substring(0, 2)}R01`, rule: `${typeName}专属规则1`, severity: 'error' },
            { id: `${typeName.substring(0, 2)}R02`, rule: `${typeName}专属规则2`, severity: 'warning' },
          ],
          updateAt: new Date().toISOString(),
        }, null, 2), 'utf-8');
      }
      
      // 创作最佳实践.md
      const practicePath = path.join(typePath, '创作最佳实践.md');
      if (!fs.existsSync(practicePath)) {
        fs.writeFileSync(practicePath, `# ${typeName}创作最佳实践

## 类型特点
- 

## 创作技巧
- 

## 优质案例
- 

## 常见问题
- 
`, 'utf-8');
      }
      
      // 问题案例库.md
      const problemPath = path.join(typePath, '问题案例库.md');
      if (!fs.existsSync(problemPath)) {
        fs.writeFileSync(problemPath, `# ${typeName}问题案例库

## 高频问题

### 问题1
- **描述**：
- **出现频次**：
- **根因**：
- **解决方案**：

## 问题统计

| 问题类型 | 出现频次 | 严重程度 |
|---------|---------|---------|
`, 'utf-8');
      }
      
      // 预防方案库.md
      const preventionPath = path.join(typePath, '预防方案库.md');
      if (!fs.existsSync(preventionPath)) {
        fs.writeFileSync(preventionPath, `# ${typeName}预防方案库

## 问题前置预防措施

### 预防措施1
- **针对问题**：
- **预防方法**：
- **执行时机**：

## 预防清单
- [ ] 
`, 'utf-8');
      }
      
      // 文风规范库.md
      const styleGuidePath = path.join(typePath, '文风规范库.md');
      if (!fs.existsSync(styleGuidePath)) {
        fs.writeFileSync(styleGuidePath, `# ${typeName}文风规范

## 文风特点
- 

## 语言风格
- 

## 句式特点
- 

## 节奏把控
- 
`, 'utf-8');
      }
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

// ============ ZeroToken IPC Handlers ============

interface Credentials {
  cookie: string;
  bearer?: string;
  userAgent?: string;
}

ipcMain.handle('zero-token:start', async (_, port?: number) => {
  try {
    const server = createZeroTokenServer(port);
    await server.start();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('zero-token:stop', async () => {
  try {
    const server = getZeroTokenServer();
    server.stop();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('zero-token:status', async () => {
  try {
    const server = getZeroTokenServer();
    return {
      success: true,
      port: server.getPort(),
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('zero-token:get-providers', async () => {
  try {
    const server = getZeroTokenServer();
    return { success: true, providers: server.getProviders() };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('zero-token:open-login', async (_, providerId: string) => {
  try {
    const server = getZeroTokenServer();
    await server.openLoginWindow(providerId);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('zero-token:capture-auth', async (_, providerId: string) => {
  try {
    const server = getZeroTokenServer();
    const auth = await server.captureAuth(providerId);
    return { success: true, auth };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('zero-token:get-auth-status', async () => {
  try {
    const server = getZeroTokenServer();
    return { success: true, status: server.getAuthStatus() };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('zero-token:capture-from-chrome', async (_, providerId: string) => {
  try {
    const server = getZeroTokenServer();
    const auth = await server.captureFromChrome(providerId);
    return { success: true, auth };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('zero-token:clear-auth', async (_, providerId: string) => {
  try {
    const server = getZeroTokenServer();
    server.clearAuth(providerId);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Custom API proxy to avoid CORS issues
ipcMain.handle('custom-api:proxy', async (_, options: { endpoint: string; apiKey: string; body: any }) => {
  try {
    const { endpoint, apiKey, body } = options;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data: any = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error?.message || `API 请求失败: ${response.status}`, status: response.status };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
