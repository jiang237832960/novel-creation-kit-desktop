# Novel Creation Kit Desktop - 实施任务列表

## 阶段一：基础搭建

- [ ] 1. 初始化项目结构和目录
  - 更新目录结构以匹配五层架构
  - 创建全局公共资源库目录结构
  - 创建单项目目录模板
  - 参考 SPEC.md 2.1 节

- [ ] 2. 实现 Electron 主进程 IPC 通信
  - 更新 main.ts 支持全局资源库操作
  - 实现全局资源加载/保存接口
  - 实现单项目初始化接口
  - 参考 SPEC.md 6.1 节

- [ ] 3. 实现 TypeScript 类型定义
  - 定义 Agent 类型接口
  - 定义全局资源库类型
  - 定义单项目类型
  - 定义 TruthFile 类型
  - 参考 types/index.ts

- [ ] 4. 实现 Zustand Store
  - 实现 projectStore（项目状态）
  - 实现 workflowStore（工作流状态）
  - 实现 settingsStore（设置状态）
  - 实现 globalResourcesStore（全局资源状态）
  - 实现 learningStore（学习沉淀状态）
  - 参考 stores/index.ts

- [ ] 5. 实现 Layout 组件
  - 实现 MainLayout（主布局）
  - 实现侧边栏导航
  - 实现 Header 组件
  - 参考 pages/MainLayout.tsx

- [ ] 6. 实现 Dashboard（工作台页面）
  - 展示 9-Agent 协作流程图
  - 展示 7 个 Truth Files 入口
  - 展示质量保障体系入口
  - 快速开始按钮
  - 参考 pages/Dashboard.tsx

## 阶段二：核心功能

- [ ] 7. 实现项目管理功能
  - 项目列表页面
  - 创建项目（选择类型，初始化目录结构）
  - 删除项目（确认后删除）
  - 打开项目（进入工作区）
  - 参考 pages/ProjectList.tsx

- [ ] 8. 实现全局资源管理功能
  - 全局资源浏览页面
  - 按类型分类展示
  - 全局规则查看
  - 用户偏好管理
  - 参考 pages/GlobalResources.tsx

- [ ] 9. 实现项目工作区
  - 左侧工作流面板（9-Agent 可视化）
  - 左侧 Truth Files 面板
  - 右侧章节编辑器
  - 右侧验证审计面板
  - 参考 pages/ProjectWorkspace.tsx

- [ ] 10. 实现 11 条硬规则验证器
  - 实现 R01-R11 验证规则
  - 实现验证结果展示
  - 实现问题定位和高亮
  - 参考 services/validator.ts

- [ ] 11. 实现 33 维度审计系统
  - 实现 A-G 类维度审计
  - 实现审计报告生成
  - 实现问题建议
  - 参考 services/validator.ts

- [ ] 12. 实现 Settings（设置页面）
  - API 配置（OpenAI/Claude/自定义）
  - 全局资源路径配置
  - 系统信息展示
  - 参考 pages/Settings.tsx

## 阶段三：Agent 系统

- [ ] 13. 实现 WorkflowEngine（工作流引擎）
  - 实现 Agent 状态流转
  - 实现任务调度
  - 实现暂停/恢复/重置
  - 参考 services/llm.ts

- [ ] 14. 实现 Agent 系统提示词
  - 实现档案员提示词
  - 实现文风师提示词
  - 实现编剧提示词
  - 实现写手提示词
  - 实现其他 Agent 提示词
  - 参考 services/llm.ts

- [ ] 15. 实现 LLM 集成
  - 实现 OpenAI Provider
  - 实现 Claude Provider
  - 实现自定义 API Provider
  - 实现工厂模式
  - 参考 services/llm.ts

## 阶段四：学习闭环

- [ ] 16. 实现学习代理功能
  - 实现全局资源加载
  - 实现经验沉淀
  - 实现规则迭代
  - 实现问题统计
  - 参考 services/llm.ts

- [ ] 17. 实现全局资源同步
  - 实现增量更新
  - 实现回滚机制
  - 实现版本管理

## 阶段五：UI/UX 优化

- [ ] 18. 实现 Truth Files 编辑器
  - 实现 Markdown 编辑器
  - 实现实时预览
  - 实现自动保存
  - 实现版本历史

- [ ] 19. 实现章节编辑器
  - 实现章节创建/删除
  - 实现 Markdown 编辑
  - 实现字数统计
  - 实现保存功能

- [ ] 20. 完善验证和审计 UI
  - 实现验证结果展示面板
  - 实现审计报告可视化
  - 实现问题定位和跳转

## 检查点

- 确保所有测试通过，如有疑问请询问用户

## 阶段六：收尾

- [ ] 21. 完善错误处理
  - 实现全局错误捕获
  - 实现用户友好提示
  - 实现日志记录

- [ ] 22. 优化打包配置
  - 验证 Windows 构建
  - 验证 macOS 构建
  - 验证 Linux 构建
