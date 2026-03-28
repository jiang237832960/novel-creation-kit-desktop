# Novel Creation Kit Desktop

基于 Electron + React + TypeScript 的多智能体小说创作桌面应用。

## 核心定位

采用「五层分层架构+双层学习体系」，实现「全局类型化学习、单项目轻量化、全流程标准化、持续自进化」的工业化小说创作系统。

## 功能特点

### 12个Agent协作系统

| Agent | 职责 |
|-------|------|
| 创作总监 | 用户交互入口，技能调度核心 |
| 学习代理 | 全局学习、经验沉淀、规则迭代 |
| 总导演 | 章节创作调度、任务拆解 |
| 档案员 | 上下文组装、设定维护、伏笔追踪 |
| 文风师 | 文风标准制定、叙事节奏控制 |
| 编剧 | 场景设定、剧情架构、细纲创作 |
| 写手 | 正文初稿写作 |
| 字数管控师 | 字数监控、合规校验 |
| 润色师 | 文本润色、AI痕迹去除 |
| 验证官 | 全维度校验、问题定位 |
| 修订师 | 问题修复、细节优化 |
| 灵活Agent | 根据需求灵活适配 |

### 质量保障体系

- **11条硬规则**：零LLM成本的自动检查
- **33维度审计**：全方位质量保障

### SOP闭环

```
项目初始化 → Agent执行 → 验证官校验 → 修订师修复 → 学习代理沉淀
     ↓
项目完结 → 复盘总结 → 规则迭代 → 全局复用
```

## 技术栈

| 层级 | 技术 |
|-----|------|
| 桌面框架 | Electron 28+ |
| 前端 | React 18 + TypeScript |
| 状态管理 | Zustand |
| UI组件 | Ant Design 5 |
| 构建工具 | Vite + electron-builder |

## 目录结构

```
novel-creation-kit-desktop/
├── electron/          # Electron主进程
│   ├── main.ts      # 主进程 + IPC
│   └── preload.ts   # 预加载脚本
├── src/             # 渲染进程
│   ├── components/  # 组件
│   ├── pages/       # 页面
│   ├── services/    # 服务
│   │   ├── llm.ts              # LLM服务
│   │   ├── validator.ts        # 验证器
│   │   ├── sopWorkflow.ts       # SOP流程
│   │   ├── permissionControl.ts  # 权限管控
│   │   └── tools/              # 工具模块
│   ├── stores/      # 状态管理
│   └── types/       # 类型定义
├── .github/          # GitHub配置
│   └── workflows/   # Actions工作流
└── public/          # 静态资源
```

## 全局资源库结构

```
~/Documents/NovelCreationKit/global_resources/
├── public_learnings/
│   ├── 全类型通用学习库/
│   │   ├── universal_rules.json
│   │   ├── 通用合规性规范.md
│   │   ├── 通用格式规范.md
│   │   ├── 通用问题案例库.md
│   │   ├── 通用预防方案库.md
│   │   └── 通用创作最佳实践.md
│   └── 分类型专属学习库/
│       ├── 无限流小说/
│       ├── 玄幻小说/
│       ├── 都市小说/
│       ├── 科幻小说/
│       ├── 悬疑推理小说/
│       └── 其他类型小说/
└── public_writing_style/
    └── 网文文风规范/
```

## 单项目目录结构

```
~/Documents/NovelCreationKit/projects/{project-id}/
├── truth_files/              # 7个Truth Files
│   ├── current_state.md
│   ├── resource_ledger.md
│   ├── pending_hooks.md
│   ├── chapter_summaries.md
│   ├── subplot_board.md
│   ├── emotional_arcs.md
│   └── character_matrix.md
├── chapters/                # 正文
├── characters/              # 人物设定
├── synopsis/                # 细纲
├── .project_settings/       # 项目专属设定
├── creative_scheme.md
├── world_setting.md
└── outline.md
```

## 安装使用

### 从源码构建

```bash
# 克隆项目
git clone https://github.com/jiang237832960/novel-creation-kit-desktop.git
cd novel-creation-kit-desktop

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建Windows exe
npm run build
```

### 下载预构建版本

访问 [Releases](https://github.com/jiang237832960/novel-creation-kit-desktop/releases) 下载最新版本。

## 项目依赖

- Node.js 18+
- npm 9+

## License

MIT
