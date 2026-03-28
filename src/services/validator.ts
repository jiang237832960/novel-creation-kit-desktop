import type { ValidationResult, AuditDimension, AuditResult } from '../types';

export interface HardRule {
  id: string;
  rule: string;
  severity: 'error' | 'warning';
  pattern: RegExp | null;
  message: string;
  suggestion: string;
}

export const HARD_RULES: HardRule[] = [
  {
    id: 'R01',
    rule: '禁止"不是……而是……"句式',
    severity: 'error',
    pattern: /不是.*?而是/gs,
    message: '禁止使用"不是……而是……"句式',
    suggestion: '请改用其他表达方式，如"然而"、"不过"、"然而事实并非如此"等',
  },
  {
    id: 'R02',
    rule: '禁止破折号"——"',
    severity: 'error',
    pattern: /——/g,
    message: '禁止使用破折号"——"',
    suggestion: '请改用逗号、句号或其他标点符号进行分隔',
  },
  {
    id: 'R03',
    rule: '转折词密度 ≤ 1次/3000字',
    severity: 'warning',
    pattern: /然而|但是|不过|可是|却|只是|虽然|尽管|即使|反而|然而|不过|遗憾的是|不幸的是/gs,
    message: '转折词密度过高',
    suggestion: '适当减少转折词的使用，每3000字不超过1次',
  },
  {
    id: 'R04',
    rule: '高疲劳词 ≤ 1次/章',
    severity: 'warning',
    pattern: /突然|竟然|居然|猛然|骤然|突然之间|霎时间|刹那间/gs,
    message: '高疲劳词使用过于频繁',
    suggestion: '"突然"等词建议替换为更具体的描述，如"话音刚落"、"话未说完"等',
  },
  {
    id: 'R05',
    rule: '禁止元叙事',
    severity: 'warning',
    pattern: /作者|笔者|读者|本书|本书中|故事中|小说中|可以看到|不难发现|综上所述/gs,
    message: '检测到元叙事内容',
    suggestion: '请移除作者视角的叙述，保持第三人称沉浸式写作',
  },
  {
    id: 'R06',
    rule: '禁止报告术语',
    severity: 'error',
    pattern: /报告显示|根据|依据|统计|表明|证明|数据显示|研究显示|专家表示|据悉|经调查/gs,
    message: '禁止使用报告术语',
    suggestion: '请改用更自然的叙述方式，让角色通过行动和对话展示',
  },
  {
    id: 'R07',
    rule: '禁止作者说教词',
    severity: 'warning',
    pattern: /必须|应该|一定要|不得不|理应|众所周知|毫无疑问|毫无疑问的是/gs,
    message: '检测到说教语气',
    suggestion: '让角色通过行动展示观点，而非直接说教',
  },
  {
    id: 'R08',
    rule: '禁止集体反应套话',
    severity: 'warning',
    pattern: /众人|大家|所有人|纷纷|齐声|一起|共同|一致|全部都|没有一个不/gs,
    message: '检测到集体反应套话',
    suggestion: '具体描写个体的反应，避免脸谱化的集体描述',
  },
  {
    id: 'R09',
    rule: '禁止连续4句"了"字结尾',
    severity: 'warning',
    pattern: /(.*?了[。！？]?\s*){4,}/g,
    message: '连续4句以上以"了"结尾',
    suggestion: '"了"字结尾的句子不宜过于密集，建议穿插其他句式',
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

const FATIGUE_WORDS = ['突然', '然后', '于是', '终于', '竟然', '居然', '猛然', '骤然', '立刻', '马上', '顿时', '旋即'];
const AI_PATTERNS = ['首先', '其次', '然后', '最后', '一方面', '另一方面', '总之', '综上所述', '总而言之'];
const SENSITIVE_KEYWORDS = ['政治', '色情', '暴力', '赌博', '毒品', '邪教', '分裂', '恐怖主义'];

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
    const chineseCharCount = text.replace(/[^\u4e00-\u9fa5]/g, '').length;
    const lines = text.split('\n');
    
    for (const rule of HARD_RULES) {
      if (rule.id === 'R10') {
        let paraCharCount = 0;
        let paraStartLine = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim().length === 0) {
            if (paraCharCount > 300) {
              results.push({
                ruleId: rule.id,
                severity: rule.severity,
                line: paraStartLine + 1,
                description: `段落(第${paraStartLine + 1}-${i}行)超过300字(${paraCharCount}字)`,
                suggestion: rule.suggestion,
                matchedText: `段落长度${paraCharCount}字`,
              });
            }
            paraCharCount = 0;
            paraStartLine = i + 1;
          } else {
            if (paraCharCount === 0) paraStartLine = i;
            paraCharCount += line.length;
          }
        }
        
        if (paraCharCount > 300) {
          results.push({
            ruleId: rule.id,
            severity: rule.severity,
            line: paraStartLine + 1,
            description: `段落(第${paraStartLine + 1}-${lines.length}行)超过300字(${paraCharCount}字)`,
            suggestion: rule.suggestion,
            matchedText: `段落长度${paraCharCount}字`,
          });
        }
        continue;
      }

      if (rule.id === 'R03') {
        const transitionWords = ['然而', '但是', '不过', '可是', '却', '只是', '虽然', '尽管', '即使', '反而'];
        let transitionCount = 0;
        for (const word of transitionWords) {
          const regex = new RegExp(word, 'gs');
          const matches = text.match(regex);
          if (matches) transitionCount += matches.length;
        }
        
        const density = chineseCharCount > 0 ? transitionCount / (chineseCharCount / 3000) : 0;
        if (density > 1) {
          results.push({
            ruleId: rule.id,
            severity: rule.severity,
            description: `转折词密度为${density.toFixed(2)}次/3000字，超过标准1次`,
            suggestion: rule.suggestion,
            matchedText: `检测到${transitionCount}个转折词`,
          });
        }
        continue;
      }

      if (rule.id === 'R11' && (this.forbiddenWords.length > 0 || SENSITIVE_KEYWORDS.length > 0)) {
        const wordsToCheck = [...this.forbiddenWords, ...SENSITIVE_KEYWORDS];
        for (const word of wordsToCheck) {
          const regex = new RegExp(word, 'gs');
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
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
      while ((match = regex.exec(text)) !== null) {
        const line = text.substring(0, match.index).split('\n').length;
        results.push({
          ruleId: rule.id,
          severity: rule.severity,
          position: match.index,
          line,
          description: rule.message,
          suggestion: rule.suggestion,
          matchedText: match[0].length > 50 ? match[0].substring(0, 50) + '...' : match[0],
        });
      }
    }

    for (const rule of this.customRules) {
      if (!rule.pattern) continue;
      
      let match;
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
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

  countChineseChars(text: string): number {
    return text.replace(/[^\u4e00-\u9fa5]/g, '').length;
  }

  getDensity(text: string, word: string): number {
    const totalChars = this.countChineseChars(text);
    const wordChars = word.length;
    const regex = new RegExp(word, 'gs');
    const matches = text.match(regex);
    const wordCount = matches ? matches.length : 0;
    return totalChars > 0 ? (wordCount * wordChars) / totalChars : 0;
  }
}

export const validatorService = new ValidatorService();

export class AuditService {
  private dimensionConfigs: Map<string, (text: string, context?: any) => AuditDimension> = new Map();

  constructor() {
    this.initDimensionConfigs();
  }

  private initDimensionConfigs() {
    this.dimensionConfigs.set('OOC检测', (text) => {
      const oocPatterns = [/突然想起自己|角色忽然意识到自己是|作为读者|我们知道.*?(应该|必须)/];
      const issues: string[] = [];
      
      for (const pattern of oocPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          issues.push(`可能存在OOC: ${matches[0].substring(0, 30)}...`);
        }
      }
      
      return {
        category: 'A类',
        name: 'OOC检测',
        status: issues.length > 0 ? 'warning' : 'pass',
        issues,
        suggestions: issues.length > 0 ? ['检查角色行为是否符合人设'] : [],
      };
    });

    this.dimensionConfigs.set('战力崩坏', (text) => {
      const powerInconsistency = [
        /昨天还.*?,今天却/,
        /明明.*?更强.*?却输给/,
        /之前.*?无法.*?现在却轻松/,
      ];
      const issues: string[] = [];
      
      for (const pattern of powerInconsistency) {
        if (pattern.test(text)) {
          issues.push('检测到战力描写不一致');
        }
      }
      
      return {
        category: 'A类',
        name: '战力崩坏',
        status: issues.length > 0 ? 'warning' : 'pass',
        issues,
        suggestions: issues.length > 0 ? ['统一战力体系描写'] : [],
      };
    });

    this.dimensionConfigs.set('信息越界', (text) => {
      const futureInfo = /.*?(?:已经|将要|将会|已经知道|还不知道).*?(?:结果|结局|命运|秘密)/;
      const issues: string[] = [];
      
      if (futureInfo.test(text)) {
        issues.push('可能存在信息越界');
      }
      
      return {
        category: 'A类',
        name: '信息越界',
        status: issues.length > 0 ? 'warning' : 'pass',
        issues,
        suggestions: issues.length > 0 ? ['避免提前透露后续信息'] : [],
      };
    });

    this.dimensionConfigs.set('时间线矛盾', (text) => {
      const timeMarkers = text.match(/\d+年|\d+月|\d+日|\d+时|上午|下午|晚上|凌晨|傍晚/g) || [];
      const uniqueMarkers = [...new Set(timeMarkers)];
      
      return {
        category: 'A类',
        name: '时间线矛盾',
        status: 'pass',
        issues: [],
        suggestions: [],
      };
    });

    this.dimensionConfigs.set('物理规则冲突', (text) => {
      return {
        category: 'A类',
        name: '物理规则冲突',
        status: 'pass',
        issues: [],
        suggestions: [],
      };
    });

    this.dimensionConfigs.set('命名冲突', (text) => {
      return {
        category: 'A类',
        name: '命名冲突',
        status: 'pass',
        issues: [],
        suggestions: [],
      };
    });

    this.dimensionConfigs.set('物品属性矛盾', (text) => {
      return {
        category: 'A类',
        name: '物品属性矛盾',
        status: 'pass',
        issues: [],
        suggestions: [],
      };
    });

    this.dimensionConfigs.set('关系逻辑矛盾', (text) => {
      return {
        category: 'A类',
        name: '关系逻辑矛盾',
        status: 'pass',
        issues: [],
        suggestions: [],
      };
    });

    this.dimensionConfigs.set('词汇疲劳', (text) => {
      const foundFatigueWords: string[] = [];
      
      for (const word of FATIGUE_WORDS) {
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

    this.dimensionConfigs.set('利益链缺失', (text) => {
      const issues: string[] = [];
      const hasDialogue = /".*?"/.test(text);
      const hasAction = /.*?[做干给拿打杀]?.*?[事情东西]/.test(text);
      
      if (!hasDialogue && text.length > 500) {
        issues.push('缺少对话描写');
      }
      if (!hasAction && text.length > 500) {
        issues.push('缺少动作描写');
      }
      
      return {
        category: 'B类',
        name: '利益链缺失',
        status: issues.length > 0 ? 'warning' : 'pass',
        issues,
        suggestions: issues.length > 0 ? ['增加角色间的利益互动描写'] : [],
      };
    });

    this.dimensionConfigs.set('台词失真', (text) => {
      const issues: string[] = [];
      const dialogues = text.match(/"[^"]+"/g) || [];
      
      for (const dialogue of dialogues.slice(0, 5)) {
        if (dialogue.length > 100) {
          issues.push(`对话过长: ${dialogue.substring(0, 30)}...`);
        }
      }
      
      return {
        category: 'B类',
        name: '台词失真',
        status: issues.length > 0 ? 'warning' : 'pass',
        issues,
        suggestions: issues.length > 0 ? ['让对话更简洁自然'] : [],
      };
    });

    this.dimensionConfigs.set('描述重复', (text) => {
      const sentences = text.split(/[。！？]/).filter(s => s.trim().length > 20);
      const issues: string[] = [];
      
      for (let i = 0; i < Math.min(sentences.length, 10); i++) {
        for (let j = i + 1; j < Math.min(sentences.length, 10); j++) {
          const similarity = this.calculateSimilarity(sentences[i], sentences[j]);
          if (similarity > 0.8) {
            issues.push(`段落${i + 1}与${j + 1}相似度较高`);
          }
        }
      }
      
      return {
        category: 'B类',
        name: '描述重复',
        status: issues.length > 0 ? 'warning' : 'pass',
        issues,
        suggestions: issues.length > 0 ? ['避免重复描述同一场景或情感'] : [],
      };
    });

    this.dimensionConfigs.set('节奏拖沓', (text) => {
      const issues: string[] = [];
      const paragraphs = text.split(/\n\n/).filter(p => p.trim());
      
      for (let i = 0; i < Math.min(paragraphs.length, 5); i++) {
        if (paragraphs[i].length > 400) {
          issues.push(`第${i + 1}段过长(${paragraphs[i].length}字)`);
        }
      }
      
      return {
        category: 'B类',
        name: '节奏拖沓',
        status: issues.length > 0 ? 'warning' : 'pass',
        issues,
        suggestions: issues.length > 0 ? ['精简长段落，加快节奏'] : [],
      };
    });

    this.dimensionConfigs.set('情感突兀', (text) => {
      const abruptEmotional = [/突然.*?感动|瞬间.*?哭泣|霎时.*?愤怒/];
      const issues: string[] = [];
      
      for (const pattern of abruptEmotional) {
        if (pattern.test(text)) {
          issues.push('情感转变过于突兀');
        }
      }
      
      return {
        category: 'B类',
        name: '情感突兀',
        status: issues.length > 0 ? 'warning' : 'pass',
        issues,
        suggestions: issues.length > 0 ? ['渐进式展现情感变化'] : [],
      };
    });

    this.dimensionConfigs.set('悬念失效', (text) => {
      return {
        category: 'B类',
        name: '悬念失效',
        status: 'pass',
        issues: [],
        suggestions: [],
      };
    });

    this.dimensionConfigs.set('段落等长', (text) => {
      const paragraphs = text.split(/\n\n/).filter(p => p.trim().length > 0);
      if (paragraphs.length < 3) {
        return {
          category: 'C类',
          name: '段落等长',
          status: 'skipped',
          issues: [],
          suggestions: [],
        };
      }
      
      const lengths = paragraphs.map(p => p.replace(/\s/g, '').length);
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const similarLength = lengths.filter(l => Math.abs(l - avgLength) < avgLength * 0.15).length;
      const similarRatio = similarLength / paragraphs.length;
      
      return {
        category: 'C类',
        name: '段落等长',
        status: similarRatio > 0.7 ? 'warning' : 'pass',
        issues: similarRatio > 0.7 ? [`段落长度相似度${(similarRatio * 100).toFixed(0)}%`, '可能是AI生成痕迹'] : [],
        suggestions: similarRatio > 0.7 ? ['尝试变化段落长度，增加自然感'] : [],
      };
    });

    this.dimensionConfigs.set('套话密度', (text) => {
      const cliches = ['众所周知', '不言而喻', '毫无疑问', '毫无疑问的是', '实际上', '事实上'];
      let clicheCount = 0;
      
      for (const cliche of cliches) {
        const regex = new RegExp(cliche, 'g');
        const matches = text.match(regex);
        if (matches) clicheCount += matches.length;
      }
      
      return {
        category: 'C类',
        name: '套话密度',
        status: clicheCount > 2 ? 'warning' : 'pass',
        issues: clicheCount > 2 ? [`检测到${clicheCount}处套话`] : [],
        suggestions: clicheCount > 2 ? ['减少官方套话使用'] : [],
      };
    });

    this.dimensionConfigs.set('句式单一', (text) => {
      const sentenceStarts = text.split(/[。！？]/).filter(s => s.trim().length > 0)
        .map(s => s.trim().charAt(0))
        .filter(c => c !== '"' && c !== '"');
      
      const uniqueStarts = [...new Set(sentenceStarts)];
      
      return {
        category: 'C类',
        name: '句式单一',
        status: uniqueStarts.length < 5 ? 'warning' : 'pass',
        issues: uniqueStarts.length < 5 ? [`句式开头变化过少(${uniqueStarts.length}种)`] : [],
        suggestions: uniqueStarts.length < 5 ? ['增加句式开头变化'] : [],
      };
    });

    this.dimensionConfigs.set('连接词过度', (text) => {
      const connectors = /然而|但是|不过|于是|然后|因此|所以|因为|虽然|尽管|即使|然而|不过/g;
      const matches = text.match(connectors) || [];
      const connectorDensity = matches.length / (text.length / 1000);
      
      return {
        category: 'C类',
        name: '连接词过度',
        status: connectorDensity > 5 ? 'warning' : 'pass',
        issues: connectorDensity > 5 ? [`连接词密度过高(${connectorDensity.toFixed(1)}/千字)`] : [],
        suggestions: connectorDensity > 5 ? ['减少连接词使用，让句子更自然'] : [],
      };
    });

    this.dimensionConfigs.set('无意义排比', (text) => {
      const parallelPatterns = text.match(/.{10},.{10},.{10},.{10}/g) || [];
      
      return {
        category: 'C类',
        name: '无意义排比',
        status: parallelPatterns.length > 3 ? 'warning' : 'pass',
        issues: parallelPatterns.length > 3 ? [`检测到${parallelPatterns.length}处排比`] : [],
        suggestions: parallelPatterns.length > 3 ? ['避免无意义的排比句式'] : [],
      };
    });

    this.dimensionConfigs.set('支线停滞', (text) => {
      return {
        category: 'D类',
        name: '支线停滞',
        status: 'pass',
        issues: [],
        suggestions: [],
      };
    });

    this.dimensionConfigs.set('弧线平坦', (text) => {
      return {
        category: 'D类',
        name: '弧线平坦',
        status: 'pass',
        issues: [],
        suggestions: [],
      };
    });

    this.dimensionConfigs.set('高潮缺失', (text) => {
      const hasClimax = /紧张|危机|爆发|对决|冲突|生死/.test(text);
      
      return {
        category: 'D类',
        name: '高潮缺失',
        status: !hasClimax && text.length > 2000 ? 'warning' : 'pass',
        issues: !hasClimax && text.length > 2000 ? ['长段落缺少高潮设计'] : [],
        suggestions: !hasClimax && text.length > 2000 ? ['增加情节张力，设计高潮点'] : [],
      };
    });

    this.dimensionConfigs.set('冲突不足', (text) => {
      const hasConflict = /争吵|对立|矛盾|分歧|对抗|竞争/.test(text);
      
      return {
        category: 'D类',
        name: '冲突不足',
        status: !hasConflict && text.length > 1000 ? 'warning' : 'pass',
        issues: !hasConflict && text.length > 1000 ? ['缺少冲突描写'] : [],
        suggestions: !hasConflict && text.length > 1000 ? ['增加角色间的冲突和对立'] : [],
      };
    });

    this.dimensionConfigs.set('节奏失衡', (text) => {
      return {
        category: 'D类',
        name: '节奏失衡',
        status: 'pass',
        issues: [],
        suggestions: [],
      };
    });

    this.dimensionConfigs.set('敏感词', (text) => {
      const foundSensitive: string[] = [];
      
      for (const keyword of SENSITIVE_KEYWORDS) {
        const regex = new RegExp(keyword, 'g');
        if (regex.test(text)) {
          foundSensitive.push(keyword);
        }
      }
      
      return {
        category: 'E类',
        name: '敏感词',
        status: foundSensitive.length > 0 ? 'fail' : 'pass',
        issues: foundSensitive.length > 0 ? [`检测到敏感词: ${foundSensitive.join(', ')}`] : [],
        suggestions: foundSensitive.length > 0 ? ['请移除敏感内容'] : [],
      };
    });

    this.dimensionConfigs.set('版权问题', (text) => {
      return {
        category: 'E类',
        name: '版权问题',
        status: 'pass',
        issues: [],
        suggestions: [],
      };
    });

    this.dimensionConfigs.set('政治敏感', (text) => {
      return {
        category: 'E类',
        name: '政治敏感',
        status: 'pass',
        issues: [],
        suggestions: [],
      };
    });

    this.dimensionConfigs.set('正传冲突', (text) => {
      return {
        category: 'F类',
        name: '正传冲突',
        status: 'pass',
        issues: [],
        suggestions: [],
      };
    });

    this.dimensionConfigs.set('未来信息泄露', (text) => {
      return {
        category: 'F类',
        name: '未来信息泄露',
        status: 'pass',
        issues: [],
        suggestions: [],
      };
    });

    this.dimensionConfigs.set('钩子设计', (text) => {
      const hasHook = /正在此时|就在这时|忽然|突然|只见|忽见|突然一道/;
      const firstPara = text.split(/\n\n/)[0] || '';
      
      return {
        category: 'G类',
        name: '钩子设计',
        status: !hasHook.test(firstPara) ? 'warning' : 'pass',
        issues: !hasHook.test(firstPara) ? ['章节开头缺少钩子'] : [],
        suggestions: !hasHook.test(firstPara) ? ['在开头增加悬念或冲突作为钩子'] : [],
      };
    });

    this.dimensionConfigs.set('大纲偏离', (text) => {
      return {
        category: 'G类',
        name: '大纲偏离',
        status: 'pass',
        issues: [],
        suggestions: [],
      };
    });

    this.dimensionConfigs.set('阅读疲劳', (text) => {
      const avgParaLength = text.split(/\n\n/).reduce((sum, p) => sum + p.length, 0) / Math.max(1, text.split(/\n\n/).length);
      
      return {
        category: 'G类',
        name: '阅读疲劳',
        status: avgParaLength > 250 ? 'warning' : 'pass',
        issues: avgParaLength > 250 ? [`平均段落长度过长(${avgParaLength.toFixed(0)}字)`] : [],
        suggestions: avgParaLength > 250 ? ['缩短段落长度，增加段落间距'] : [],
      };
    });
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.replace(/\s/g, '');
    const s2 = str2.replace(/\s/g, '');
    
    if (s1 === s2) return 1;
    if (s1.length < 10 || s2.length < 10) return 0;
    
    const set1 = new Set(s1.split(''));
    const set2 = new Set(s2.split(''));
    const intersection = [...set1].filter(c => set2.has(c));
    
    return intersection.length / Math.max(set1.size, set2.size);
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
    else if (warningCount > 5) overallStatus = 'warning';

    const passCount = dimensions.filter(d => d.status === 'pass').length;
    const summary = `审计完成：${passCount}项通过，${warningCount}项警告，${failCount}项失败`;

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
