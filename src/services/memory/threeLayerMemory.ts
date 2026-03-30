/**
 * 三层记忆系统 - 基于 Morpheus 最佳实践
 * 
 * L1: 身份记忆 - 世界规则、角色设定、文风契约、禁忌
 * L2: 项目记忆 - 滚动窗口、未解决伏笔、关键决策
 * L3: 章节记忆 - 每个章节的摘要和大纲
 */

export enum MemoryLayer {
  L1 = 'L1',  // 身份记忆 - 长期不变
  L2 = 'L2',  // 项目记忆 - 中期更新
  L3 = 'L3',  // 章节记忆 - 每次章节更新
}

export interface MemoryItem {
  id: string;
  layer: MemoryLayer;
  type: string;
  summary: string;
  content: string;
  entities?: string[];
  importance: number;
  recency: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface OpenThread {
  sourceChapter: number;
  text: string;
  status: 'open' | 'resolved';
  resolvedByChapter?: number;
  evidence?: string;
}

export interface RuntimeState {
  newCharacters: string[];
  characterStateChanges: string[];
  recentMainlineStatus: string[];
  lastUpdated: string;
  sourceChapters: string;
}

export interface IdentityMemory {
  worldRules: string[];
  characterHardSettings: string[];
  styleContract: string[];
  hardTaboos: string[];
}

export interface ChapterSummary {
  chapterNumber: number;
  title: string;
  status: 'draft' | 'completed';
  synopsis: string;
  wordCount: number;
  keyDecisions: string[];
  createdAt: string;
}

// Token预算配置 (基于 Morpheus)
export const MEMORY_BUDGET_RATIOS = {
  identity_core: 0.15,        // 身份核心
  runtime_state: 0.10,        // 运行态
  memory_compact: 0.15,       // 记忆压缩
  previous_synopsis: 0.10,    // 上一章摘要
  open_threads: 0.10,         // 开放线程
  previous_chapters: 0.35,    // 之前章节概览
} as const;

export const MIN_FIELD_BUDGET = 512; // 每个字段最小token预算
export const MAX_CONTEXT_TOKENS = 32768; // 最大上下文token

/**
 * 估计文本对应的token数 (中英文混合)
 * 粗略估计: 1 token ≈ 2 中文字符 或 4 英文字符
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 2 + otherChars / 4);
}

/**
 * 根据token预算截断文本
 */
export function truncateToBudget(text: string, budgetTokens: number): { text: string; used: number } {
  const maxChars = budgetTokens * 2; // 中文字符预算
  if (text.length <= maxChars) {
    return { text, used: estimateTokens(text) };
  }
  return { text: text.slice(0, maxChars), used: budgetTokens };
}

class ThreeLayerMemorySystem {
  private projectPath: string;
  private memoryDir: string;
  
  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.memoryDir = `${projectPath}/memory`;
  }

  // ==================== L1 身份记忆 ====================
  
  /**
   * 获取身份记忆 (IDENTITY.md)
   * 包含: 世界规则、角色硬设定、文风契约、禁忌
   */
  getIdentity(): string {
    const path = `${this.memoryDir}/L1/IDENTITY.md`;
    return this.readFile(path) || this.getDefaultIdentity();
  }

  private getDefaultIdentity(): string {
    return `# IDENTITY

## World Rules
- (补充世界规则)

## Character Hard Settings
- (补充角色硬设定)

## Style Contract
- (补充写作风格约束)

## Hard Taboos
- (补充禁忌)
`;
  }

  /**
   * 更新身份记忆
   */
  updateIdentity(content: string): void {
    const path = `${this.memoryDir}/L1/IDENTITY.md`;
    this.writeFile(path, content);
  }

  /**
   * 获取运行态 (RUNTIME_STATE.md)
   * 包含: 新增角色、状态变化、主线状态
   */
  getRuntimeState(): RuntimeState {
    const path = `${this.memoryDir}/L1/RUNTIME_STATE.md`;
    const content = this.readFile(path) || this.getDefaultRuntimeState();
    return this.parseRuntimeState(content);
  }

  private getDefaultRuntimeState(): string {
    return `# RUNTIME_STATE

## New Characters
- (暂无)

## Character State Changes
- (暂无)

## Recent Mainline Status
- (暂无)

---
_Last updated: ${new Date().toISOString()}_
_Source chapters: N/A_
`;
  }

  private parseRuntimeState(content: string): RuntimeState {
    const state: RuntimeState = {
      newCharacters: [],
      characterStateChanges: [],
      recentMainlineStatus: [],
      lastUpdated: '',
      sourceChapters: ''
    };

    const lines = content.split('\n');
    let currentSection = '';
    
    for (const line of lines) {
      if (line.startsWith('## ')) {
        currentSection = line.replace('## ', '').trim();
      } else if (line.startsWith('- ') && line !== '- (暂无)') {
        const text = line.slice(2).trim();
        if (currentSection === 'New Characters') {
          state.newCharacters.push(text);
        } else if (currentSection === 'Character State Changes') {
          state.characterStateChanges.push(text);
        } else if (currentSection === 'Recent Mainline Status') {
          state.recentMainlineStatus.push(text);
        }
      } else if (line.includes('_Last updated:')) {
        state.lastUpdated = line.split('_Last updated:')[1]?.split('_')[0]?.trim() || '';
      } else if (line.includes('_Source chapters:')) {
        state.sourceChapters = line.split('_Source chapters:')[1]?.split('_')[0]?.trim() || '';
      }
    }
    
    return state;
  }

  /**
   * 更新运行态
   */
  updateRuntimeState(state: RuntimeState): void {
    const lines = [
      '# RUNTIME_STATE',
      '',
      '## New Characters',
      ...(state.newCharacters.length > 0 ? state.newCharacters.map(c => `- ${c}`) : ['- (暂无)']),
      '',
      '## Character State Changes',
      ...(state.characterStateChanges.length > 0 ? state.characterStateChanges.map(c => `- ${c}`) : ['- (暂无)']),
      '',
      '## Recent Mainline Status',
      ...(state.recentMainlineStatus.length > 0 ? state.recentMainlineStatus.map(s => `- ${s}`) : ['- (暂无)']),
      '',
      '---',
      `_Last updated: ${new Date().toISOString()}_`,
      `_Source chapters: ${state.sourceChapters}_`
    ];
    
    this.writeFile(`${this.memoryDir}/L1/RUNTIME_STATE.md`, lines.join('\n'));
  }

  // ==================== L2 项目记忆 ====================
  
  /**
   * 获取项目记忆 (MEMORY.md)
   * 包含: 滚动窗口(最近3章)、未解决主线线程、最近关键决策
   */
  getMemory(): string {
    const path = `${this.memoryDir}/L2/MEMORY.md`;
    return this.readFile(path) || this.getDefaultMemory();
  }

  private getDefaultMemory(): string {
    return `# MEMORY

## Rolling Window (Recent 3 Chapters)
（最近 3 章的关键决策与状态将在章末回写时自动填充）

## Unresolved Mainline Threads
（未回收的主线伏笔将在 OPEN_THREADS.md 重算时同步更新）

## Recent Key Decisions
（从章节计划中提取的关键决策）

---
_Initialized: ${new Date().toISOString()}_
`;
  }

  /**
   * 更新项目记忆
   */
  updateMemory(content: string): void {
    const path = `${this.memoryDir}/L2/MEMORY.md`;
    this.writeFile(path, content);
  }

  /**
   * 获取开放线程 (OPEN_THREADS.md)
   */
  getOpenThreads(): OpenThread[] {
    const path = `${this.memoryDir}/OPEN_THREADS.md`;
    const content = this.readFile(path);
    if (!content) return [];
    return this.parseOpenThreads(content);
  }

  private parseOpenThreads(content: string): OpenThread[] {
    const threads: OpenThread[] = [];
    const lines = content.split('\n');
    let currentStatus: 'open' | 'resolved' = 'open';
    
    for (const line of lines) {
      if (line.startsWith('## ')) {
        currentStatus = line.includes('Resolved') ? 'resolved' : 'open';
      } else if (line.startsWith('- [Ch.') && line !== '- (暂无)') {
        const match = line.match(/-?\[[\d]+→([\d]+)\]?\s*(.+?)(?:\s*\|.*)?$/);
        if (match) {
          threads.push({
            sourceChapter: parseInt(line.match(/Ch\.(\d+)/)?.[1] || '0', 10),
            text: match[2].trim(),
            status: currentStatus,
            resolvedByChapter: match[1] ? parseInt(match[1], 10) : undefined
          });
        } else {
          const chMatch = line.match(/Ch\.(\d+)/);
          threads.push({
            sourceChapter: chMatch ? parseInt(chMatch[1], 10) : 0,
            text: line.replace(/-?\s*\[?Ch\.\d+\]?\s*/, '').replace(/\s*\|.*$/, '').trim(),
            status: currentStatus
          });
        }
      }
    }
    
    return threads;
  }

  /**
   * 更新开放线程
   */
  updateOpenThreads(threads: OpenThread[]): void {
    const openThreads = threads.filter(t => t.status === 'open');
    const resolvedThreads = threads.filter(t => t.status === 'resolved').slice(-20); // 只保留最近20个
    
    const lines = [
      '# OPEN_THREADS',
      '',
      '## Open',
      ...(openThreads.length > 0 
        ? openThreads.map(t => `- [Ch.${t.sourceChapter}] ${t.text}`)
        : ['- (暂无)']),
      '',
      '## Resolved',
      ...(resolvedThreads.length > 0
        ? resolvedThreads.map(t => `- [Ch.${t.sourceChapter}→Ch.${t.resolvedByChapter}] ${t.text} | evidence: ${t.evidence || 'pending'}`)
        : ['- (暂无)']),
      '',
      '---',
      `_Last recomputed: ${new Date().toISOString()}_`,
      `_Total: ${openThreads.length} open, ${resolvedThreads.length} resolved_`
    ];
    
    this.writeFile(`${this.memoryDir}/OPEN_THREADS.md`, lines.join('\n'));
  }

  // ==================== L3 章节记忆 ====================
  
  /**
   * 添加章节记忆
   */
  addChapterSummary(summary: ChapterSummary): string {
    const id = `ch_${summary.chapterNumber}_${Date.now()}`;
    const metadata = [
      '---',
      `id: ${id}`,
      `chapter: ${summary.chapterNumber}`,
      `type: chapter_summary`,
      `created_at: ${new Date().toISOString()}`,
      '---',
      ''
    ].join('\n');
    
    const content = [
      `# ${summary.title || `Chapter ${summary.chapterNumber}`}`,
      '',
      `状态: ${summary.status}`,
      `字数: ${summary.wordCount}`,
      '',
      `## Synopsis`,
      summary.synopsis || '(无摘要)',
      '',
      `## Key Decisions`,
      ...(summary.keyDecisions.length > 0 
        ? summary.keyDecisions.map(d => `- ${d}`)
        : ['- (无)'])
    ].join('\n');
    
    this.writeFile(`${this.memoryDir}/L3/${id}.md`, metadata + content);
    
    // 同时更新 MEMORY.md 中的章节条目
    this.appendChapterToMemory(summary);
    
    return id;
  }

  /**
   * 获取所有章节记忆
   */
  getChapterSummaries(): ChapterSummary[] {
    const dir = `${this.memoryDir}/L3`;
    const files = this.listFiles(dir, '*.md');
    
    return files.map(file => {
      const content = this.readFile(file);
      return this.parseChapterSummary(content, file);
    }).filter(Boolean) as ChapterSummary[];
  }

  private parseChapterSummary(content: string, filePath: string): ChapterSummary | null {
    const lines = content.split('\n');
    const summary: Partial<ChapterSummary> = {
      keyDecisions: []
    };
    
    const fileName = filePath.split('/').pop() || '';
    const idMatch = fileName.match(/ch_(\d+)_/);
    summary.chapterNumber = idMatch ? parseInt(idMatch[1], 10) : 0;
    
    let currentSection = '';
    
    for (const line of lines) {
      if (line.startsWith('# ') && !line.startsWith('##')) {
        summary.title = line.replace('# ', '').trim();
      } else if (line.startsWith('## ')) {
        currentSection = line.replace('## ', '').trim();
      } else if (line.startsWith('状态:')) {
        summary.status = line.replace('状态:', '').trim() as any;
      } else if (line.startsWith('字数:')) {
        summary.wordCount = parseInt(line.replace('字数:', '').trim(), 10) || 0;
      } else if (line.startsWith('- ') && line !== '- (无)' && line !== '- (暂无)') {
        if (currentSection === 'Key Decisions') {
          summary.keyDecisions!.push(line.replace('- ', '').trim());
        }
      }
    }
    
    summary.createdAt = new Date().toISOString();
    
    return summary.chapterNumber > 0 ? summary as ChapterSummary : null;
  }

  private appendChapterToMemory(summary: ChapterSummary): void {
    const memory = this.getMemory();
    const newEntry = [
      `### Chapter ${summary.chapterNumber}`,
      `- 状态: ${summary.status}`,
      `- 字数: ${summary.wordCount}`,
      `- 摘要: ${(summary.synopsis || '无').slice(0, 100)}`,
      `- 更新时间: ${new Date().toISOString()}`
    ].join('\n') + '\n';
    
    // 如果已有该章节条目，则替换；否则追加
    const pattern = new RegExp(`###\\s*Chapter\\s+${summary.chapterNumber}\\b[\\s\\S]*?(?=\\n###|\\n##|\\Z)`, 'g');
    
    if (pattern.test(memory)) {
      const updatedMemory = memory.replace(pattern, newEntry);
      this.updateMemory(updatedMemory);
    } else {
      this.updateMemory(memory + '\n' + newEntry);
    }
  }

  // ==================== 上下文打包 ====================
  
  /**
   * 构建生成上下文包 (Context Pack)
   * 参考 Morpheus 的 Budget Allocation
   */
  buildContextPack(chapterNumber: number, projectChapters: any[]): {
    identity_core: string;
    runtime_state: string;
    memory_compact: string;
    previous_chapter_synopsis: string;
    open_threads: OpenThread[];
    previous_chapters_compact: any[];
    budget_stats: Record<string, { budget: number; used: number }>;
  } {
    const contextWindow = Math.floor(MAX_CONTEXT_TOKENS * 0.6); // 60%用于输入
    const budgets = this.computeFieldBudgets(contextWindow);
    
    // 1. Identity Core (15%)
    const identity = this.getIdentity();
    const { text: identityCore, used: identityUsed } = truncateToBudget(identity, budgets.identity_core);
    
    // 2. Runtime State (10%)
    const runtimeStateContent = this.readFile(`${this.memoryDir}/L1/RUNTIME_STATE.md`) || '';
    const { text: runtimeState, used: runtimeUsed } = truncateToBudget(runtimeStateContent, budgets.runtime_state);
    
    // 3. Memory Compact (15%)
    const memory = this.getMemory();
    const { text: memoryCompact, used: memoryUsed } = truncateToBudget(memory, budgets.memory_compact);
    
    // 4. Previous Chapter Synopsis (10%)
    const summaries = this.getChapterSummaries();
    const prevChapter = summaries.find(s => s.chapterNumber === chapterNumber - 1);
    const prevSynopsis = prevChapter?.synopsis || '';
    const { text: prevSynopsisTruncated, used: prevSynUsed } = truncateToBudget(prevSynopsis, budgets.previous_synopsis);
    
    // 5. Open Threads (10%)
    const threads = this.getOpenThreads().filter(t => t.status === 'open').slice(0, 10);
    const threadsText = threads.map(t => `[Ch.${t.sourceChapter}] ${t.text}`).join('\n');
    const { text: threadsTruncated, used: threadsUsed } = truncateToBudget(threadsText, budgets.open_threads);
    
    // 6. Previous Chapters Compact (35%)
    const recentChapters = projectChapters
      .filter(c => c.chapterNumber < chapterNumber)
      .slice(-5)
      .map(c => ({
        chapterNumber: c.chapterNumber,
        title: c.title || '',
        status: c.status || '',
        wordCount: c.wordCount || 0
      }));
    const prevChaptersText = JSON.stringify(recentChapters);
    const { text: prevChaptersCompact, used: prevChUsed } = truncateToBudget(prevChaptersText, budgets.previous_chapters);
    
    return {
      identity_core: identityCore,
      runtime_state: runtimeState,
      memory_compact: memoryCompact,
      previous_chapter_synopsis: prevSynopsisTruncated,
      open_threads: threads,
      previous_chapters_compact: recentChapters,
      budget_stats: {
        identity_core: { budget: budgets.identity_core, used: identityUsed },
        runtime_state: { budget: budgets.runtime_state, used: runtimeUsed },
        memory_compact: { budget: budgets.memory_compact, used: memoryUsed },
        previous_synopsis: { budget: budgets.previous_synopsis, used: prevSynUsed },
        open_threads: { budget: budgets.open_threads, used: threadsUsed },
        previous_chapters: { budget: budgets.previous_chapters, used: prevChUsed }
      }
    };
  }

  private computeFieldBudgets(contextWindow: number): Record<string, number> {
    const budgets: Record<string, number> = {};
    
    for (const [field, ratio] of Object.entries(MEMORY_BUDGET_RATIOS)) {
      const raw = Math.floor(contextWindow * ratio);
      budgets[field] = Math.max(raw, MIN_FIELD_BUDGET);
    }
    
    const total = Object.values(budgets).reduce((a, b) => a + b, 0);
    if (total > contextWindow && contextWindow > 0) {
      const scale = contextWindow / total;
      for (const key of Object.keys(budgets)) {
        budgets[key] = Math.max(1, Math.floor(budgets[key] * scale));
      }
    }
    
    return budgets;
  }

  // ==================== 工具方法 ====================
  
  private readFile(path: string): string {
    try {
      // 在浏览器环境中使用 localStorage
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(`memory_${path}`) || '';
      }
    } catch (e) {
      console.warn('Failed to read file:', path);
    }
    return '';
  }

  private writeFile(path: string, content: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`memory_${path}`, content);
      }
    } catch (e) {
      console.warn('Failed to write file:', path);
    }
  }

  private listFiles(dir: string, pattern: string): string[] {
    // 在浏览器环境中，模拟文件列表
    const allKeys = Object.keys(localStorage || {});
    return allKeys
      .filter(k => k.startsWith(`memory_${dir}/`) && k.endsWith('.md'))
      .map(k => k.replace(`memory_${dir}/`, ''));
  }

  /**
   * 初始化记忆目录结构
   */
  initialize(): void {
    const dirs = [
      `${this.memoryDir}/L1`,
      `${this.memoryDir}/L2`, 
      `${this.memoryDir}/L3`,
      `${this.memoryDir}/logs`
    ];
    
    for (const dir of dirs) {
      // 创建默认文件
      if (dir.endsWith('/L1')) {
        if (!this.readFile(`${dir}/IDENTITY.md`)) {
          this.writeFile(`${dir}/IDENTITY.md`, this.getDefaultIdentity());
        }
        if (!this.readFile(`${dir}/RUNTIME_STATE.md`)) {
          this.writeFile(`${dir}/RUNTIME_STATE.md`, this.getDefaultRuntimeState());
        }
      } else if (dir.endsWith('/L2')) {
        if (!this.readFile(`${dir}/MEMORY.md`)) {
          this.writeFile(`${dir}/MEMORY.md`, this.getDefaultMemory());
        }
      } else if (dir.endsWith('/memory')) {
        if (!this.readFile(`${dir}/OPEN_THREADS.md`)) {
          this.writeFile(`${dir}/OPEN_THREADS.md`, `# OPEN_THREADS

## Open
- (暂无)

## Resolved
- (暂无)

---
_Last recomputed: ${new Date().toISOString()}_
_Total: 0 open, 0 resolved_
`);
        }
      }
    }
  }

  /**
   * 清除所有记忆
   */
  clear(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('memory_'));
        keysToRemove.forEach(k => localStorage.removeItem(k));
      }
    } catch (e) {
      console.warn('Failed to clear memory:', e);
    }
  }

  /**
   * 导出所有记忆为 JSON
   */
  exportAll(): Record<string, any> {
    return {
      identity: this.getIdentity(),
      runtimeState: this.getRuntimeState(),
      memory: this.getMemory(),
      openThreads: this.getOpenThreads(),
      chapterSummaries: this.getChapterSummaries()
    };
  }
}

export const threeLayerMemory = new ThreeLayerMemorySystem('');

export default ThreeLayerMemorySystem;
