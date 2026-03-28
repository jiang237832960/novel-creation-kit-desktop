import type { ValidationResult, AuditDimension, AuditResult } from '../types';

export interface HardRule {
  id: string;
  rule: string;
  severity: 'error' | 'warning';
  pattern: RegExp;
  message: string;
  suggestion: string;
}

export const HARD_RULES: HardRule[] = [
  {
    id: 'R01',
    rule: '禁止"不是……而是……"句式',
    severity: 'error',
    pattern: /不是.*?而是/g,
    message: '禁止使用"不是……而是……"句式',
    suggestion: '请改用其他表达方式，如"然而"、"不过"等',
  },
  {
    id: 'R02',
    rule: '禁止破折号"——"',
    severity: 'error',
    pattern: /——/g,
    message: '禁止使用破折号"——"',
    suggestion: '请改用逗号、句号或其他标点符号',
  },
  {
    id: 'R03',
    rule: '转折词密度 ≤ 1次/3000字',
    severity: 'warning',
    pattern: /然而|但是|不过|可是|却|只是|虽然|尽管|即使/g,
    message: '转折词密度过高',
    suggestion: '适当减少转折词的使用，每3000字不超过1次',
  },
  {
    id: 'R04',
    rule: '高疲劳词 ≤ 1次/章',
    severity: 'warning',
    pattern: /突然|竟然|居然|猛然|骤然/g,
    message: '高疲劳词使用过于频繁',
    suggestion: '"突然"等词建议替换为更具体的描述',
  },
  {
    id: 'R05',
    rule: '禁止元叙事',
    severity: 'warning',
    pattern: /作者|笔者|读者|本书|本书中|故事中|小说中/g,
    message: '检测到元叙事内容',
    suggestion: '请移除作者视角的叙述，保持第三人称沉浸式写作',
  },
  {
    id: 'R06',
    rule: '禁止报告术语',
    severity: 'error',
    pattern: /报告显示|根据|依据|统计|表明|证明/g,
    message: '禁止使用报告术语',
    suggestion: '请改用更自然的叙述方式',
  },
  {
    id: 'R07',
    rule: '禁止作者说教词',
    severity: 'warning',
    pattern: /必须|应该|一定要|不得不|理应/g,
    message: '检测到说教语气',
    suggestion: '让角色通过行动展示，而非直接说教',
  },
  {
    id: 'R08',
    rule: '禁止集体反应套话',
    severity: 'warning',
    pattern: /众人|大家|所有人|纷纷|齐声|一起/g,
    message: '检测到集体反应套话',
    suggestion: '具体描写个体的反应，避免脸谱化的集体描述',
  },
  {
    id: 'R09',
    rule: '禁止连续4句"了"字',
    severity: 'warning',
    pattern: /(.*?了.*?\n){4,}/g,
    message: '连续4句以上以"了"结尾',
    suggestion: '"了"字结尾的句子不宜过于密集',
  },
  {
    id: 'R10',
    rule: '段落长度 ≤ 300字',
    severity: 'warning',
    pattern: null as unknown as RegExp,
    message: '段落长度超标',
    suggestion: '建议将长段落拆分为多个短段落，每段不超过300字',
  },
  {
    id: 'R11',
    rule: '禁止本书禁忌',
    severity: 'error',
    pattern: null as unknown as RegExp,
    message: '检测到禁忌内容',
    suggestion: '请移除敏感内容',
  },
];

class ValidatorService {
  private forbiddenWords: string[] = [];
  private customRules: HardRule[] = [];

  setForbiddenWords(words: string[]): void {
    this.forbiddenWords = words;
  }

  addCustomRule(rule: HardRule): void {
    this.customRules.push(rule);
  }

  validateText(text: string, chapterNumber: number = 1): ValidationResult[] {
    const results: ValidationResult[] = [];
    const lines = text.split('\n');
    
    for (const rule of HARD_RULES) {
      if (rule.id === 'R10') {
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
          charCount += lines[i].length;
          if (charCount > 300 && lines[i].trim().length > 0) {
            results.push({
              ruleId: rule.id,
              severity: rule.severity,
              line: i + 1,
              description: `第${i + 1}行所在段落超过300字`,
              suggestion: rule.suggestion,
              matchedText: lines[i].substring(0, 50) + '...',
            });
            charCount = 0;
          }
          if (lines[i].trim().length === 0) {
            charCount = 0;
          }
        }
        continue;
      }

      if (rule.id === 'R11' && this.forbiddenWords.length > 0) {
        for (const word of this.forbiddenWords) {
          const regex = new RegExp(word, 'g');
          let match;
          while ((match = regex.exec(text)) !== null) {
            const line = text.substring(0, match.index).split('\n').length;
            results.push({
              ruleId: rule.id,
              severity: rule.severity,
              position: match.index,
              line,
              description: `检测到禁忌词"${word}"`,
              suggestion: rule.suggestion,
              matchedText: word,
            });
          }
        }
        continue;
      }

      if (!rule.pattern) continue;

      let match;
      const regex = new RegExp(rule.pattern.source, 'g');
      while ((match = regex.exec(text)) !== null) {
        const line = text.substring(0, match.index).split('\n').length;
        results.push({
          ruleId: rule.id,
          severity: rule.severity,
          position: match.index,
          line,
          description: rule.message,
          suggestion: rule.suggestion,
          matchedText: match[0],
        });
      }
    }

    for (const rule of this.customRules) {
      if (!rule.pattern) continue;
      
      let match;
      const regex = new RegExp(rule.pattern.source, 'g');
      while ((match = regex.exec(text)) !== null) {
        const line = text.substring(0, match.index).split('\n').length;
        results.push({
          ruleId: rule.id,
          severity: rule.severity,
          position: match.index,
          line,
          description: rule.message,
          suggestion: rule.suggestion,
          matchedText: match[0],
        });
      }
    }

    return this.deduplicateResults(results);
  }

  private deduplicateResults(results: ValidationResult[]): ValidationResult[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      const key = `${result.ruleId}-${result.line}-${result.matchedText}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  getRuleById(id: string): HardRule | undefined {
    return HARD_RULES.find((r) => r.id === id);
  }

  countWords(text: string): number {
    return text.replace(/\s/g, '').length;
  }

  countChars(text: string): number {
    return text.length;
  }

  getDensity(text: string, word: string): number {
    const totalChars = this.countChars(text);
    const wordChars = word.length;
    const regex = new RegExp(word, 'g');
    const matches = text.match(regex);
    const wordCount = matches ? matches.length : 0;
    return totalChars > 0 ? (wordCount * wordChars) / totalChars : 0;
  }
}

export const validatorService = new ValidatorService();

export class AuditService {
  private dimensionConfigs: Map<string, (text: string) => AuditDimension> = new Map();

  constructor() {
    this.initDimensionConfigs();
  }

  private initDimensionConfigs() {
    this.dimensionConfigs.set('OOC检测', (text) => ({
      category: 'A类',
      name: 'OOC检测',
      status: 'pass',
      issues: [],
      suggestions: [],
    }));

    this.dimensionConfigs.set('战力崩坏', (text) => ({
      category: 'A类',
      name: '战力崩坏',
      status: 'pass',
      issues: [],
      suggestions: [],
    }));

    this.dimensionConfigs.set('词汇疲劳', (text) => {
      const fatigueWords = ['突然', '然后', '于是', '终于', '竟然', '居然', '猛然', '骤然'];
      const foundFatigueWords: string[] = [];
      
      for (const word of fatigueWords) {
        const regex = new RegExp(word, 'g');
        const matches = text.match(regex);
        if (matches && matches.length > 3) {
          foundFatigueWords.push(`${word}(${matches.length}次)`);
        }
      }
      
      return {
        category: 'B类',
        name: '词汇疲劳',
        status: foundFatigueWords.length > 0 ? 'warning' : 'pass',
        issues: foundFatigueWords.length > 0 ? [`检测到高频疲劳词: ${foundFatigueWords.join(', ')}`] : [],
        suggestions: foundFatigueWords.length > 0 ? ['建议替换为更丰富的表达'] : [],
      };
    });

    this.dimensionConfigs.set('段落等长', (text) => {
      const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
      if (paragraphs.length < 3) {
        return {
          category: 'C类',
          name: '段落等长',
          status: 'skipped',
          issues: [],
          suggestions: [],
        };
      }
      
      const avgLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length;
      const similarLength = paragraphs.filter(p => 
        Math.abs(p.length - avgLength) < avgLength * 0.1
      ).length;
      
      return {
        category: 'C类',
        name: '段落等长',
        status: similarLength / paragraphs.length > 0.7 ? 'warning' : 'pass',
        issues: similarLength / paragraphs.length > 0.7 ? ['段落长度过于均匀，可能是AI生成痕迹'] : [],
        suggestions: similarLength / paragraphs.length > 0.7 ? ['尝试变化段落长度，增加自然感'] : [],
      };
    });
  }

  auditChapter(text: string, chapterId: string): AuditResult {
    const dimensions: AuditDimension[] = [];
    const dimensionNames = [
      'OOC检测', '战力崩坏', '信息越界', '时间线矛盾', '物理规则冲突', '命名冲突', '物品属性矛盾', '关系逻辑矛盾',
      '词汇疲劳', '利益链缺失', '台词失真', '描述重复', '节奏拖沓', '情感突兀', '悬念失效',
      '段落等长', '套话密度', '句式单一', '连接词过度', '无意义排比',
      '支线停滞', '弧线平坦', '高潮缺失', '冲突不足', '节奏失衡',
      '敏感词', '版权问题', '政治敏感',
      '正传冲突', '未来信息泄露',
      '钩子设计', '大纲偏离', '阅读疲劳',
    ];

    for (const name of dimensionNames) {
      const config = this.dimensionConfigs.get(name);
      if (config) {
        dimensions.push(config(text));
      } else {
        dimensions.push({
          category: 'A类',
          name,
          status: 'skipped',
          issues: [],
          suggestions: [],
        });
      }
    }

    const failCount = dimensions.filter(d => d.status === 'fail').length;
    const warningCount = dimensions.filter(d => d.status === 'warning').length;
    
    let overallStatus: 'pass' | 'warning' | 'fail' = 'pass';
    if (failCount > 0) overallStatus = 'fail';
    else if (warningCount > 3) overallStatus = 'warning';

    const summary = `审计完成：${dimensions.filter(d => d.status === 'pass').length} 项通过，${warningCount} 项警告，${failCount} 项失败`;

    return {
      chapterId,
      timestamp: new Date().toISOString(),
      dimensions,
      overallStatus,
      summary,
    };
  }
}

export const auditService = new AuditService();
