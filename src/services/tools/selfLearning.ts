import { Tool } from './toolManager';
import type { ProblemCase, BestPractice, UserPreference } from '../../types';

export interface LearningRecord {
  id: string;
  type: 'problem' | 'practice' | 'preference';
  category: string;
  content: string;
  source: string;
  timestamp: string;
  verified: boolean;
  frequency?: number;
}

export interface LearningSummary {
  totalProblems: number;
  totalPractices: number;
  totalPreferences: number;
  recentRecords: LearningRecord[];
  categoryStats: { category: string; count: number }[];
}

export interface ExperienceExtraction {
  practices: BestPractice[];
  problems: ProblemCase[];
  preferences: UserPreference[];
}

class SelfLearningTool implements Tool {
  id = 'self_learning';
  name = 'SelfLearning';
  nameCn = '自学习代理工具';
  description = '错误记录、规则提取、经验沉淀';

  private learningRecords: LearningRecord[] = [];
  private problemCases: Map<string, ProblemCase> = new Map();
  private bestPractices: Map<string, BestPractice> = new Map();
  private preferences: Map<string, UserPreference> = new Map();

  async execute(params: {
    action: 'record' | 'extract' | 'summarize' | 'query';
    data?: any;
  }): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    try {
      const { action, data } = params;

      switch (action) {
        case 'record':
          return this.recordLearning(data);
        case 'extract':
          return this.extractExperience(data);
        case 'summarize':
          return this.getSummary();
        case 'query':
          return this.queryKnowledge(data);
        default:
          return { success: false, error: 'Unknown action' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async recordLearning(data: {
    type: 'problem' | 'practice' | 'preference';
    category: string;
    content: string;
    source: string;
    metadata?: any;
  }): Promise<{ success: boolean; recordId?: string; error?: string }> {
    const record: LearningRecord = {
      id: `lr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      category: data.category,
      content: data.content,
      source: data.source,
      timestamp: new Date().toISOString(),
      verified: false,
    };

    this.learningRecords.push(record);

    if (data.type === 'problem' && data.metadata) {
      const problem: ProblemCase = {
        id: record.id,
        category: data.category as any,
        problem: data.content,
        rootCause: data.metadata.rootCause || '',
        solution: data.metadata.solution || '',
        frequency: 1,
        severity: data.metadata.severity || 'medium',
      };
      this.problemCases.set(record.id, problem);
    }

    if (data.type === 'practice' && data.metadata) {
      const practice: BestPractice = {
        id: record.id,
        category: data.category as any,
        title: data.metadata.title || data.content.substring(0, 50),
        description: data.content,
        适用场景: data.metadata.scenario || '',
        verifiedCount: 0,
      };
      this.bestPractices.set(record.id, practice);
    }

    return { success: true, recordId: record.id };
  }

  private async extractExperience(data: {
    projectId: string;
    chapters?: { id: string; content: string; feedback?: string }[];
    userFeedback?: string;
  }): Promise<{
    success: boolean;
    extracted?: ExperienceExtraction;
    error?: string;
  }> {
    try {
      const extractedPractices: BestPractice[] = [];
      const extractedProblems: ProblemCase[] = [];

      if (data.chapters) {
        for (const chapter of data.chapters) {
          if (chapter.feedback) {
            const practice: BestPractice = {
              id: `exp_${chapter.id}_${Date.now()}`,
              category: '通用',
              title: `章节${chapter.id}优化经验`,
              description: chapter.feedback,
              适用场景: '章节优化',
              verifiedCount: 1,
            };
            extractedPractices.push(practice);
          }
        }
      }

      return {
        success: true,
        extracted: {
          practices: extractedPractices,
          problems: extractedProblems,
          preferences: [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async getSummary(): Promise<{
    success: boolean;
    summary?: LearningSummary;
    error?: string;
  }> {
    const categoryCount = new Map<string, number>();
    
    this.learningRecords.forEach(record => {
      categoryCount.set(record.category, (categoryCount.get(record.category) || 0) + 1);
    });

    const categoryStats = Array.from(categoryCount.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    return {
      success: true,
      summary: {
        totalProblems: this.learningRecords.filter(r => r.type === 'problem').length,
        totalPractices: this.learningRecords.filter(r => r.type === 'practice').length,
        totalPreferences: this.learningRecords.filter(r => r.type === 'preference').length,
        recentRecords: this.learningRecords.slice(-10).reverse(),
        categoryStats,
      },
    };
  }

  private async queryKnowledge(data: {
    type?: 'problem' | 'practice' | 'preference';
    category?: string;
    keyword?: string;
  }): Promise<{
    success: boolean;
    results?: LearningRecord[];
    error?: string;
  }> {
    let results = this.learningRecords;

    if (data.type) {
      results = results.filter(r => r.type === data.type);
    }

    if (data.category) {
      results = results.filter(r => r.category === data.category);
    }

    if (data.keyword) {
      const keyword = data.keyword.toLowerCase();
      results = results.filter(r => r.content.toLowerCase().includes(keyword));
    }

    return { success: true, results };
  }

  async updateProblemFrequency(problemId: string): Promise<{
    success: boolean;
    frequency?: number;
    error?: string;
  }> {
    const problem = this.problemCases.get(problemId);
    if (problem) {
      problem.frequency = (problem.frequency || 0) + 1;
      return { success: true, frequency: problem.frequency };
    }
    return { success: false, error: 'Problem not found' };
  }

  async verifyPractice(practiceId: string): Promise<{
    success: boolean;
    verifiedCount?: number;
    error?: string;
  }> {
    const practice = this.bestPractices.get(practiceId);
    if (practice) {
      practice.verifiedCount += 1;
      return { success: true, verifiedCount: practice.verifiedCount };
    }
    return { success: false, error: 'Practice not found' };
  }

  getProblemByFrequency(minFrequency: number = 3): ProblemCase[] {
    return Array.from(this.problemCases.values())
      .filter(p => (p.frequency || 0) >= minFrequency)
      .sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
  }

  getTopPractices(limit: number = 10): BestPractice[] {
    return Array.from(this.bestPractices.values())
      .sort((a, b) => b.verifiedCount - a.verifiedCount)
      .slice(0, limit);
  }
}

export const selfLearningTool = new SelfLearningTool();
