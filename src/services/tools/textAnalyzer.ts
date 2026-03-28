import { Tool } from './toolManager';

export interface StyleAnalysis {
  formality: number;
  sentenceLengthAvg: number;
  paragraphLengthAvg: number;
  dialogueRatio: number;
  descriptionDensity: number;
  emotionalWords: { word: string; count: number; category: string }[];
  styleProfile: string[];
}

export interface AITraceDetection {
  isAIGenerated: boolean;
  confidence: number;
  indicators: { type: string; score: number; description: string }[];
  suggestions: string[];
}

export interface TextStatistics {
  totalChars: number;
  chineseChars: number;
  englishChars: number;
  numbers: number;
  punctuation: number;
  spaces: number;
  paragraphs: number;
  sentences: number;
  words: number;
  avgSentenceLength: number;
  avgParagraphLength: number;
}

export interface RhythmAnalysis {
  score: number;
  hasHook: boolean;
  hasClimax: boolean;
  hasPause: boolean;
  rhythmType: 'fast' | 'moderate' | 'slow';
  suggestions: string[];
}

class TextAnalyzerTool implements Tool {
  id = 'text_analyzer';
  name = 'TextAnalyzer';
  nameCn = '文本分析器';
  description = '文风分析、AI痕迹检测、文本统计、网文节奏适配检测';

  private emotionalWords = {
    positive: ['高兴', '开心', '快乐', '喜悦', '兴奋', '激动', '欣慰', '感动', '温暖', '幸福'],
    negative: ['悲伤', '难过', '伤心', '痛苦', '愤怒', '生气', '恐惧', '害怕', '焦虑', '忧虑'],
    neutral: ['平静', '淡然', '冷静', '淡定', '客观', '中立'],
  };

  async execute(params: {
    text: string;
    analysisType: 'style' | 'ai-trace' | 'statistics' | 'rhythm';
  }): Promise<{
    success: boolean;
    result?: StyleAnalysis | AITraceDetection | TextStatistics | RhythmAnalysis;
    error?: string;
  }> {
    try {
      const { text, analysisType } = params;

      switch (analysisType) {
        case 'style':
          return { success: true, result: this.analyzeStyle(text) };
        case 'ai-trace':
          return { success: true, result: this.detectAITrace(text) };
        case 'statistics':
          return { success: true, result: this.getStatistics(text) };
        case 'rhythm':
          return { success: true, result: this.analyzeRhythm(text) };
        default:
          return { success: false, error: 'Unknown analysis type' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private analyzeStyle(text: string): StyleAnalysis {
    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim());
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    const dialogues = text.match(/"[^"]+"/g) || [];

    const totalChars = text.length;
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;

    const sentenceLengths = sentences.map(s => s.replace(/[\s\d]/g, '').length);
    const sentenceLengthAvg = sentenceLengths.reduce((a, b) => a + b, 0) / Math.max(1, sentenceLengths.length);

    const paragraphLengths = paragraphs.map(p => p.length);
    const paragraphLengthAvg = paragraphLengths.reduce((a, b) => a + b, 0) / Math.max(1, paragraphLengths.length);

    const dialogueRatio = dialogues.join('').length / Math.max(1, totalChars);

    const descriptionDensity = (totalChars - dialogues.join('').length) / Math.max(1, totalChars);

    const emotionalWords: StyleAnalysis['emotionalWords'] = [];
    const wordCount = new Map<string, number>();

    for (const [category, words] of Object.entries(this.emotionalWords)) {
      for (const word of words) {
        const regex = new RegExp(word, 'g');
        const matches = text.match(regex);
        if (matches && matches.length > 0) {
          wordCount.set(word, matches.length);
          emotionalWords.push({ word, count: matches.length, category });
        }
      }
    }

    const formality = this.calculateFormality(text);

    const styleProfile: string[] = [];
    if (formality < 0.4) styleProfile.push('口语化');
    else if (formality > 0.7) styleProfile.push('正式');
    if (dialogueRatio > 0.3) styleProfile.push('对话密集');
    if (descriptionDensity > 0.7) styleProfile.push('描写丰富');
    if (sentenceLengthAvg > 50) styleProfile.push('长句为主');
    else if (sentenceLengthAvg < 20) styleProfile.push('短句为主');

    return {
      formality,
      sentenceLengthAvg,
      paragraphLengthAvg,
      dialogueRatio,
      descriptionDensity,
      emotionalWords: emotionalWords.sort((a, b) => b.count - a.count),
      styleProfile,
    };
  }

  private calculateFormality(text: string): number {
    const formalWords = ['因此', '然而', '于是', '从而', '并且', '此外', '由于', '既然', '倘若'];
    const informalWords = ['所以', '可是', '但是', '不过', '然后', '就是说', '也就是'];

    let formalCount = 0;
    let informalCount = 0;

    for (const word of formalWords) {
      const regex = new RegExp(word, 'g');
      const matches = text.match(regex);
      if (matches) formalCount += matches.length;
    }

    for (const word of informalWords) {
      const regex = new RegExp(word, 'g');
      const matches = text.match(regex);
      if (matches) informalCount += matches.length;
    }

    const total = formalCount + informalCount;
    if (total === 0) return 0.5;
    return formalCount / total;
  }

  private detectAITrace(text: string): AITraceDetection {
    const indicators: AITraceDetection['indicators'] = [];
    let totalScore = 0;

    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim());
    const paragraphLengths = sentences.map(s => s.length);
    const avgLength = paragraphLengths.reduce((a, b) => a + b, 0) / Math.max(1, paragraphLengths.length);
    const lengthVariance = paragraphLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / Math.max(1, paragraphLengths.length);
    
    if (lengthVariance < 100) {
      indicators.push({
        type: '段落等长',
        score: 0.8,
        description: '段落长度过于均匀',
      });
      totalScore += 0.8;
    }

    const aiPatterns = [
      { pattern: /首先/gi, weight: 0.3 },
      { pattern: /其次/gi, weight: 0.3 },
      { pattern: /然后/gi, weight: 0.2 },
      { pattern: /最后/gi, weight: 0.3 },
      { pattern: /总之/gi, weight: 0.4 },
      { pattern: /综上所述/gi, weight: 0.5 },
      { pattern: /总而言之/gi, weight: 0.5 },
      { pattern: /一方面.*?另一方面/gs, weight: 0.4 },
    ];

    for (const { pattern, weight } of aiPatterns) {
      if (pattern.test(text)) {
        indicators.push({
          type: 'AI套话',
          score: weight,
          description: '检测到AI常用套话',
        });
        totalScore += weight;
        pattern.lastIndex = 0;
      }
    }

    const connectorDensity = (text.match(/然而|但是|不过|于是|然后|因此|所以|因为|虽然/g) || []).length;
    const connectorScore = Math.min(1, connectorDensity / 20);
    if (connectorScore > 0.5) {
      indicators.push({
        type: '连接词过度',
        score: connectorScore * 0.5,
        description: `连接词密度过高 (${connectorDensity}处)`,
      });
      totalScore += connectorScore * 0.5;
    }

    const starts = sentences.slice(0, 10).map(s => s.trim().charAt(0));
    const uniqueStarts = new Set(starts);
    if (uniqueStarts.size < 5) {
      indicators.push({
        type: '句式单一',
        score: 0.6,
        description: '句子开头变化过少',
      });
      totalScore += 0.6;
    }

    const confidence = Math.min(1, totalScore / 3);
    const isAIGenerated = confidence > 0.5;

    const suggestions: string[] = [];
    if (isAIGenerated) {
      suggestions.push('建议增加句式变化');
      suggestions.push('减少AI常用连接词');
      suggestions.push('变化段落长度');
    }

    return {
      isAIGenerated,
      confidence,
      indicators,
      suggestions,
    };
  }

  private getStatistics(text: string): TextStatistics {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const numbers = (text.match(/\d/g) || []).length;
    const punctuation = (text.match(/[，。！？、；：""''【】《》（）!?,.:;"'()[\]]/g) || []).length;
    const spaces = (text.match(/\s/g) || []).length;
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim()).length;
    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim()).length;
    const words = (text.match(/[\u4e00-\u9fa5]+/g) || []).length;

    const sentenceLengths = sentences > 0 
      ? text.split(/[。！？.!?]+/).filter(s => s.trim()).map(s => s.length)
      : [0];
    const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / Math.max(1, sentenceLengths.length);

    const paragraphLengths = paragraphs > 0
      ? text.split(/\n\n+/).filter(p => p.trim()).map(p => p.length)
      : [0];
    const avgParagraphLength = paragraphLengths.reduce((a, b) => a + b, 0) / Math.max(1, paragraphLengths.length);

    return {
      totalChars: text.length,
      chineseChars,
      englishChars,
      numbers,
      punctuation,
      spaces,
      paragraphs,
      sentences,
      words,
      avgSentenceLength,
      avgParagraphLength,
    };
  }

  private analyzeRhythm(text: string): RhythmAnalysis {
    const suggestions: string[] = [];
    let score = 100;

    const firstPara = text.split(/\n\n/)[0] || '';
    const hasHook = /正在此时|就在这时|忽然|突然|只见|忽见|突然一道|蓦然|忽然间/.test(firstPara);
    
    if (!hasHook) {
      suggestions.push('章节开头缺少钩子，建议增加悬念或冲突');
      score -= 20;
    }

    const hasClimax = /紧张|危机|爆发|对决|冲突|生死|决战|搏斗|争吵|对立/.test(text);
    
    if (!hasClimax && text.length > 1000) {
      suggestions.push('缺少高潮设计，建议增加情节张力');
      score -= 15;
    }

    const hasPause = /\n\n/.test(text);
    
    if (!hasPause) {
      suggestions.push('缺少段落间隔，建议增加留白');
      score -= 10;
    }

    const sentences = text.split(/[。！？]/).filter(s => s.trim().length > 0);
    const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / Math.max(1, sentences.length);

    let rhythmType: 'fast' | 'moderate' | 'slow' = 'moderate';
    if (avgLength < 25) {
      rhythmType = 'fast';
      suggestions.push('节奏较快，适合网文');
    } else if (avgLength > 50) {
      rhythmType = 'slow';
      suggestions.push('节奏较慢，建议精简长句');
    }

    return {
      score: Math.max(0, score),
      hasHook,
      hasClimax,
      hasPause,
      rhythmType,
      suggestions,
    };
  }
}

export const textAnalyzerTool = new TextAnalyzerTool();
