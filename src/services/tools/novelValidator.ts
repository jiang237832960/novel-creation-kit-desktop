import { Tool } from './toolManager';
import { validatorService, HARD_RULES } from '../validator';
import type { ValidationResult, AuditResult } from '../../types';

export interface ValidationReport {
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  results: ValidationResult[];
}

export interface SemanticAnalysis {
  similarityScore: number;
  repetitivePhrases: { phrase: string; count: number; positions: number[] }[];
  suggestions: string[];
}

class NovelValidatorTool implements Tool {
  id = 'novel_validator';
  name = 'NovelValidator';
  nameCn = '小说综合验证器';
  description = '全维度校验、语义匹配、根因分析';

  async execute(params: {
    text: string;
    chapterNumber?: number;
    customForbiddenWords?: string[];
  }): Promise<{
    success: boolean;
    report?: ValidationReport;
    error?: string;
  }> {
    try {
      const { text, chapterNumber = 1, customForbiddenWords = [] } = params;

      if (customForbiddenWords.length > 0) {
        validatorService.setForbiddenWords(customForbiddenWords);
      }

      const results = validatorService.validateText(text, chapterNumber);
      const errorCount = results.filter(r => r.severity === 'error').length;
      const warningCount = results.filter(r => r.severity === 'warning').length;

      return {
        success: true,
        report: {
          totalIssues: results.length,
          errorCount,
          warningCount,
          results,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async analyzeSemantic(text: string): Promise<{
    success: boolean;
    analysis?: SemanticAnalysis;
    error?: string;
  }> {
    try {
      const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 10);
      const phraseFrequency = new Map<string, number>();
      const phrasePositions = new Map<string, number[]>();

      for (let i = 0; i < sentences.length; i++) {
        const words = sentences[i].match(/[\u4e00-\u9fa5]{4,}/g) || [];
        for (const phrase of words) {
          phraseFrequency.set(phrase, (phraseFrequency.get(phrase) || 0) + 1);
          const positions = phrasePositions.get(phrase) || [];
          positions.push(i);
          phrasePositions.set(phrase, positions);
        }
      }

      const repetitivePhrases: SemanticAnalysis['repetitivePhrases'] = [];
      let totalSimilarity = 0;
      let comparisons = 0;

      phraseFrequency.forEach((count, phrase) => {
        if (count > 2) {
          repetitivePhrases.push({
            phrase,
            count,
            positions: phrasePositions.get(phrase) || [],
          });
        }
      });

      for (let i = 0; i < Math.min(sentences.length, 20); i++) {
        for (let j = i + 1; j < Math.min(sentences.length, 20); j++) {
          const similarity = this.calculateSentenceSimilarity(sentences[i], sentences[j]);
          totalSimilarity += similarity;
          comparisons++;
        }
      }

      const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;

      return {
        success: true,
        analysis: {
          similarityScore: avgSimilarity,
          repetitivePhrases: repetitivePhrases.sort((a, b) => b.count - a.count).slice(0, 10),
          suggestions: this.generateSuggestions(avgSimilarity, repetitivePhrases),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private calculateSentenceSimilarity(s1: string, s2: string): number {
    const words1 = new Set(s1.match(/[\u4e00-\u9fa5]+/g) || []);
    const words2 = new Set(s2.match(/[\u4e00-\u9fa5]+/g) || []);
    
    if (words1.size === 0 || words2.size === 0) return 0;
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private generateSuggestions(
    similarity: number,
    repetitivePhrases: { phrase: string; count: number }[]
  ): string[] {
    const suggestions: string[] = [];

    if (similarity > 0.6) {
      suggestions.push('句子间相似度较高，建议增加句式变化');
    }

    if (repetitivePhrases.length > 0) {
      suggestions.push(`存在${repetitivePhrases.length}个高频短语，建议替换为近义词`);
    }

    return suggestions;
  }

  getRules(): { id: string; rule: string; severity: 'error' | 'warning' }[] {
    return HARD_RULES.map(r => ({
      id: r.id,
      rule: r.rule,
      severity: r.severity,
    }));
  }
}

export const novelValidatorTool = new NovelValidatorTool();
