/**
 * 伏笔追踪系统 - 基于 Morpheus OPEN_THREADS 设计
 * 
 * 功能：
 * 1. 追踪开放/已解决的伏笔线索
 * 2. 自动检测伏笔是否在后续章节中被回收
 * 3. 提供伏笔置信度评分
 * 4. 支持关键词和回调目标匹配
 */

export interface Foreshadowing {
  id: string;
  sourceChapter: number;
  text: string;
  keywords: string[];
  status: 'open' | 'resolved';
  resolvedByChapter?: number;
  evidence?: string;
  confidence: number;
  createdAt: string;
}

export interface Hook {
  id: string;
  type: 'suspense' | 'cliffhanger' | 'question' | 'prophecy';
  text: string;
  sourceChapter: number;
  status: 'active' | 'fired' | 'forgotten';
  firedChapter?: number;
}

export class ForeshadowingTracker {
  private foreshadowings: Foreshadowing[] = [];
  private hooks: Hook[] = [];
  private storageKey: string;

  constructor(projectId: string) {
    this.storageKey = `foreshadowing_${projectId}`;
    this.load();
  }

  /**
   * 添加伏笔
   */
  addForeshadowing(sourceChapter: number, text: string): Foreshadowing {
    const keywords = this.extractKeywords(text);
    
    const foreshadowing: Foreshadowing = {
      id: `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sourceChapter,
      text,
      keywords,
      status: 'open',
      confidence: 0.5,
      createdAt: new Date().toISOString()
    };
    
    this.foreshadowings.push(foreshadowing);
    this.save();
    return foreshadowing;
  }

  /**
   * 添加钩子
   */
  addHook(type: Hook['type'], text: string, sourceChapter: number): Hook {
    const hook: Hook = {
      id: `hook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      text,
      sourceChapter,
      status: 'active'
    };
    
    this.hooks.push(hook);
    this.save();
    return hook;
  }

  /**
   * 检测伏笔是否在章节文本中被解决
   */
  checkResolution(chapterNumber: number, chapterText: string): Foreshadowing[] {
    const resolved: Foreshadowing[] = [];
    
    for (const fs of this.foreshadowings) {
      if (fs.status === 'resolved') continue;
      if (fs.sourceChapter >= chapterNumber) continue;
      
      // 检查关键词匹配
      const matchedKeywords = fs.keywords.filter(kw => chapterText.includes(kw));
      const matchRatio = matchedKeywords.length / Math.max(fs.keywords.length, 1);
      
      // 置信度计算
      const confidence = this.calculateConfidence(fs, chapterText, chapterNumber, matchedKeywords);
      
      // 如果置信度超过阈值，标记为已解决
      if (confidence > 0.6) {
        fs.status = 'resolved';
        fs.resolvedByChapter = chapterNumber;
        fs.evidence = `keyword match: ${matchedKeywords.join(', ')}`;
        fs.confidence = confidence;
        resolved.push(fs);
      }
    }
    
    this.save();
    return resolved;
  }

  /**
   * 计算伏笔解决置信度
   */
  private calculateConfidence(
    fs: Foreshadowing,
    chapterText: string,
    chapterNumber: number,
    matchedKeywords: string[]
  ): number {
    let confidence = 0;
    
    // 1. 关键词匹配 (权重: 0.4)
    if (fs.keywords.length > 0) {
      const matchRatio = matchedKeywords.length / fs.keywords.length;
      confidence += 0.4 * matchRatio;
    }
    
    // 2. 章节距离 (权重: 0.3)
    // 越近的章节解决，置信度越高
    const distance = chapterNumber - fs.sourceChapter;
    const recency = 1 / Math.max(distance, 1);
    confidence += 0.3 * recency;
    
    // 3. 直接提及 (权重: 0.3)
    // 如果关键词直接出现在文本中，而不仅是模糊匹配
    if (matchedKeywords.length > 0) {
      const directMention = matchedKeywords.some(kw => {
        const context = this.getTextContext(chapterText, kw, 50);
        return context.some(ctx => ctx.includes(fs.text.slice(0, 20)));
      });
      if (directMention) {
        confidence += 0.3;
      }
    }
    
    return Math.min(confidence, 1);
  }

  /**
   * 获取关键词在文本中的上下文
   */
  private getTextContext(text: string, keyword: string, window: number): string[] {
    const contexts: string[] = [];
    let start = 0;
    
    while (true) {
      const index = text.indexOf(keyword, start);
      if (index === -1) break;
      
      const contextStart = Math.max(0, index - window);
      const contextEnd = Math.min(text.length, index + keyword.length + window);
      contexts.push(text.slice(contextStart, contextEnd));
      
      start = index + 1;
    }
    
    return contexts;
  }

  /**
   * 提取伏笔文本中的关键词
   */
  private extractKeywords(text: string): string[] {
    // 简单关键词提取：连续的中文字符序列
    const keywords: string[] = [];
    const chineseWords = text.match(/[\u4e00-\u9fa5]{2,8}/g) || [];
    
    // 过滤停用词
    const stopWords = ['的', '了', '在', '是', '我', '你', '他', '她', '它', '有', '和', '与', '或', '但', '而', '所以', '因为', '如果'];
    
    for (const word of chineseWords) {
      if (word.length >= 2 && !stopWords.includes(word)) {
        keywords.push(word);
      }
    }
    
    // 返回最重要的5个关键词
    return keywords.slice(0, 5);
  }

  /**
   * 获取所有开放伏笔
   */
  getOpenForeshadowings(): Foreshadowing[] {
    return this.foreshadowings.filter(fs => fs.status === 'open');
  }

  /**
   * 获取所有已解决伏笔
   */
  getResolvedForeshadowings(): Foreshadowing[] {
    return this.foreshadowings.filter(fs => fs.status === 'resolved');
  }

  /**
   * 获取活跃钩子
   */
  getActiveHooks(): Hook[] {
    return this.hooks.filter(h => h.status === 'active');
  }

  /**
   * 触发钩子
   */
  fireHook(hookId: string, firedChapter: number): Hook | null {
    const hook = this.hooks.find(h => h.id === hookId);
    if (hook) {
      hook.status = 'fired';
      hook.firedChapter = firedChapter;
      this.save();
    }
    return hook || null;
  }

  /**
   * 标记钩子为遗忘
   */
  forgetHook(hookId: string): Hook | null {
    const hook = this.hooks.find(h => h.id === hookId);
    if (hook) {
      hook.status = 'forgotten';
      this.save();
    }
    return hook || null;
  }

  /**
   * 获取伏笔统计信息
   */
  getStats(): {
    total: number;
    open: number;
    resolved: number;
    resolutionRate: number;
    avgResolutionDistance: number;
  } {
    const total = this.foreshadowings.length;
    const open = this.foreshadowings.filter(fs => fs.status === 'open').length;
    const resolved = this.foreshadowings.filter(fs => fs.status === 'resolved').length;
    
    // 计算平均解决距离
    const resolvedWithDistance = this.foreshadowings
      .filter(fs => fs.status === 'resolved' && fs.resolvedByChapter)
      .map(fs => fs.resolvedByChapter! - fs.sourceChapter);
    
    const avgResolutionDistance = resolvedWithDistance.length > 0
      ? resolvedWithDistance.reduce((a, b) => a + b, 0) / resolvedWithDistance.length
      : 0;
    
    return {
      total,
      open,
      resolved,
      resolutionRate: total > 0 ? resolved / total : 0,
      avgResolutionDistance
    };
  }

  /**
   * 生成 OPEN_THREADS 格式的报告
   */
  generateOpenThreadsReport(): string {
    const open = this.getOpenForeshadowings();
    const resolved = this.getResolvedForeshadowings().slice(-20); // 只保留最近20个
    
    const lines = [
      '# OPEN_THREADS',
      '',
      '## Open',
      ...(open.length > 0 
        ? open.map(fs => `- [Ch.${fs.sourceChapter}] ${fs.text}`)
        : ['- (暂无)']),
      '',
      '## Resolved',
      ...(resolved.length > 0
        ? resolved.map(fs => {
            const evidence = fs.evidence ? ` | evidence: ${fs.evidence}` : '';
            return `- [Ch.${fs.sourceChapter}→Ch.${fs.resolvedByChapter}] ${fs.text}${evidence}`;
          })
        : ['- (暂无)']),
      '',
      '---',
      `_Last recomputed: ${new Date().toISOString()}_`,
      `_Total: ${open.length} open, ${resolved.length} resolved_`
    ];
    
    return lines.join('\n');
  }

  private save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        foreshadowings: this.foreshadowings,
        hooks: this.hooks
      }));
    } catch (e) {
      console.warn('Failed to save foreshadowing data:', e);
    }
  }

  private load(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.foreshadowings = data.foreshadowings || [];
        this.hooks = data.hooks || [];
      }
    } catch (e) {
      console.warn('Failed to load foreshadowing data:', e);
    }
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this.foreshadowings = [];
    this.hooks = [];
    this.save();
  }

  /**
   * 导出数据
   */
  export(): { foreshadowings: Foreshadowing[]; hooks: Hook[] } {
    return {
      foreshadowings: this.foreshadowings,
      hooks: this.hooks
    };
  }
}

export default ForeshadowingTracker;
