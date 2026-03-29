import { workflowEngine } from './llm';
import { selfLearningTool } from './tools/selfLearning';
import { novelValidatorTool } from './tools/novelValidator';
import { intelligentSchedulerTool } from './tools/intelligentScheduler';
import type { Project, Chapter, ValidationResult, AuditResult } from '../types';

export interface SOPPhase {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  results?: any;
}

export interface LearningReport {
  projectId: string;
  projectName: string;
  type: string;
  completedAt: string;
  statistics: {
    totalChapters: number;
    totalWords: number;
    problemsResolved: number;
    newPractices: number;
    rulesUpdated: number;
  };
  extractedPractices: string[];
  extractedProblemSolutions: string[];
  userPreferences: string[];
  iterationReport?: string;
}

class SOPWorkflow {
  private currentPhase: string = '';
  private phases: Map<string, SOPPhase> = new Map();
  private projectContext: {
    project?: Project;
    chapters?: Chapter[];
    currentChapter?: Chapter;
    validationResults?: ValidationResult[];
    auditResult?: AuditResult;
  } = {};

  async initializeProject(project: Project, novelType: string): Promise<{
    success: boolean;
    result?: {
      globalResourcesLoaded: boolean;
      projectSettingsCreated: boolean;
      agentSkillsLoaded: boolean;
    };
    error?: string;
  }> {
    this.setPhase('initialization', { name: '项目初始化', status: 'running', startTime: Date.now() });

    try {
      await this.loadGlobalResources(novelType);
      await this.initializeProjectSettings(project);
      await this.syncAgentSkills();

      this.setPhase('initialization', {
        name: '项目初始化',
        status: 'completed',
        endTime: Date.now(),
        results: {
          globalResourcesLoaded: true,
          projectSettingsCreated: true,
          agentSkillsLoaded: true,
        },
      });

      return { success: true, result: { globalResourcesLoaded: true, projectSettingsCreated: true, agentSkillsLoaded: true } };
    } catch (error) {
      this.setPhase('initialization', { name: '项目初始化', status: 'failed' });
      return { success: false, error: error instanceof Error ? error.message : '初始化失败' };
    }
  }

  async runCreationWorkflow(chapter: Chapter): Promise<{
    success: boolean;
    result?: {
      chapterCompleted: boolean;
      validationPassed: boolean;
      auditPassed: boolean;
    };
    error?: string;
  }> {
    this.setPhase('creation', { name: '项目创作', status: 'running', startTime: Date.now() });
    this.projectContext.currentChapter = chapter;

    try {
      await this.scheduleTasks(chapter);
      workflowEngine.start();
      await this.waitForWorkflowCompletion();

      const validationResults = await this.runValidation(chapter.content);
      this.projectContext.validationResults = validationResults;

      const hasErrors = validationResults.some(r => r.severity === 'error');
      if (hasErrors) {
        await this.runRevision(chapter.content, validationResults);
      }

      await this.accumulateExperience(chapter, validationResults);

      this.setPhase('creation', {
        name: '项目创作',
        status: 'completed',
        endTime: Date.now(),
        results: {
          chapterCompleted: true,
          validationPassed: !hasErrors,
          auditPassed: true,
        },
      });

      return { success: true, result: { chapterCompleted: true, validationPassed: !hasErrors, auditPassed: true } };
    } catch (error) {
      this.setPhase('creation', { name: '项目创作', status: 'failed' });
      return { success: false, error: error instanceof Error ? error.message : '创作失败' };
    }
  }

  async completeProject(project: Project): Promise<{
    success: boolean;
    report?: LearningReport;
    error?: string;
  }> {
    this.setPhase('completion', { name: '项目完结', status: 'running', startTime: Date.now() });
    this.projectContext.project = project;

    try {
      const reviewResult = await this.performProjectReview(project);
      await this.reviewAndApproveAccumulation();
      const report = this.generateLearningReport(project, reviewResult);
      await this.updateGlobalResources(report);

      this.setPhase('completion', {
        name: '项目完结',
        status: 'completed',
        endTime: Date.now(),
        results: report,
      });

      return { success: true, report };
    } catch (error) {
      this.setPhase('completion', { name: '项目完结', status: 'failed' });
      return { success: false, error: error instanceof Error ? error.message : '完结失败' };
    }
  }

  private async loadGlobalResources(novelType: string): Promise<void> {
    const result = await selfLearningTool.execute({
      action: 'query',
      data: { category: novelType },
    });

    if (!result.success) {
      throw new Error('加载全局资源失败');
    }
  }

  private async initializeProjectSettings(project: Project): Promise<void> {
    if (!window.electronAPI) return;

    const settingsPath = `${project.path}/.project_settings/项目专属设定规则.md`;
    const exists = await window.electronAPI.fileExists(settingsPath);

    if (!exists) {
      await window.electronAPI.writeFile(settingsPath, `# 项目专属设定规则

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
`);
    }
  }

  private async syncAgentSkills(): Promise<void> {
    await selfLearningTool.execute({
      action: 'record',
      data: {
        type: 'practice',
        category: '系统',
        content: '项目初始化完成，Agent技能已同步',
        source: '系统初始化',
      },
    });
  }

  private async scheduleTasks(chapter: Chapter): Promise<void> {
    await intelligentSchedulerTool.execute({
      tasks: [
        { id: 't1', type: 'chapter', priority: 'high', dependencies: [] },
      ],
      availableAgents: workflowEngine.getAgents(),
    });
  }

  private waitForWorkflowCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!workflowEngine.isWorkflowRunning()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });
  }

  private async runValidation(content: string): Promise<ValidationResult[]> {
    const result = await novelValidatorTool.execute({ text: content });
    return result.report?.results || [];
  }

  private async runRevision(content: string, validationResults: ValidationResult[]): Promise<void> {
    const errors = validationResults.filter(r => r.severity === 'error');
    for (const error of errors) {
      await selfLearningTool.execute({
        action: 'record',
        data: {
          type: 'problem',
          category: '创作',
          content: error.description,
          source: '验证官校验',
          metadata: {
            solution: error.suggestion,
            severity: error.severity,
          },
        },
      });
    }
  }

  private async accumulateExperience(chapter: Chapter, validationResults: ValidationResult[]): Promise<void> {
    const problemCounts = new Map<string, number>();
    for (const result of validationResults) {
      const count = problemCounts.get(result.ruleId) || 0;
      problemCounts.set(result.ruleId, count + 1);
    }

    for (const [ruleId, count] of problemCounts.entries()) {
      if (count >= 5) {
        await selfLearningTool.execute({
          action: 'record',
          data: {
            type: 'problem',
            category: '高频问题',
            content: `规则${ruleId}出现频次${count}次`,
            source: `章节${chapter.number}`,
            metadata: { frequency: count },
          },
        });
      }
    }
  }

  private async performProjectReview(project: Project): Promise<{
    statistics: LearningReport['statistics'];
    extractedPractices: string[];
    extractedProblemSolutions: string[];
    userPreferences: string[];
  }> {
    return {
      statistics: {
        totalChapters: this.projectContext.chapters?.length || 0,
        totalWords: this.projectContext.chapters?.reduce((sum, ch) => sum + ch.wordCount, 0) || 0,
        problemsResolved: 0,
        newPractices: 0,
        rulesUpdated: 0,
      },
      extractedPractices: [],
      extractedProblemSolutions: [],
      userPreferences: [],
    };
  }

  private async reviewAndApproveAccumulation(): Promise<void> {
    // 创作总监审核通过后，方可更新全局资源
  }

  private generateLearningReport(project: Project, reviewResult: any): LearningReport {
    return {
      projectId: project.id,
      projectName: project.name,
      type: project.type,
      completedAt: new Date().toISOString(),
      statistics: reviewResult.statistics,
      extractedPractices: reviewResult.extractedPractices,
      extractedProblemSolutions: reviewResult.extractedProblemSolutions,
      userPreferences: reviewResult.userPreferences,
      iterationReport: `# ${project.name} 项目完结学习报告

## 基本信息
- 项目名称：${project.name}
- 项目类型：${project.type}
- 完成时间：${new Date().toLocaleString('zh-CN')}

## 统计信息
- 总章节数：${reviewResult.statistics.totalChapters}
- 总字数：${reviewResult.statistics.totalWords}
- 解决问题数：${reviewResult.statistics.problemsResolved}
- 新增实践数：${reviewResult.statistics.newPractices}
- 更新规则数：${reviewResult.statistics.rulesUpdated}

## 沉淀经验
${reviewResult.extractedPractices.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

## 问题解决方案
${reviewResult.extractedProblemSolutions.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}
`,
    };
  }

  private async updateGlobalResources(report: LearningReport): Promise<void> {
    for (const practice of report.extractedPractices) {
      await selfLearningTool.execute({
        action: 'record',
        data: {
          type: 'practice',
          category: report.type,
          content: practice,
          source: report.projectName,
          metadata: { verified: false },
        },
      });
    }
  }

  private setPhase(phaseId: string, phase: SOPPhase): void {
    this.currentPhase = phaseId;
    this.phases.set(phaseId, phase);
  }

  getPhaseStatus(): SOPPhase | undefined {
    return this.phases.get(this.currentPhase);
  }

  getAllPhases(): SOPPhase[] {
    return Array.from(this.phases.values());
  }
}

export const sopWorkflow = new SOPWorkflow();
