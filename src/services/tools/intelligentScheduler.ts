import { Tool } from './toolManager';
import type { Agent } from '../../types';

export interface Task {
  id: string;
  type: 'outline' | 'character' | 'chapter' | 'revision' | 'polish' | 'validation';
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  estimatedDuration?: number;
}

export interface AgentTaskAssignment {
  agentId: string;
  agentName: string;
  tasks: Task[];
}

export interface WorkflowPlan {
  totalDuration: number;
  assignments: AgentTaskAssignment[];
  executionOrder: { agentId: string; taskId: string }[];
}

const AGENT_CAPABILITIES: Record<string, string[]> = {
  'chief-director': ['outline', 'character', 'chapter'],
  'archivist': ['character', 'outline'],
  'stylist': ['character', 'polish'],
  'screenwriter': ['outline', 'character', 'chapter'],
  'writer': ['chapter', 'revision'],
  'wordcount': ['chapter'],
  'polisher': ['polish', 'revision'],
  'verifier': ['validation'],
  'reviser': ['revision'],
  'learning': ['character', 'outline'],
};

const TASK_PRIORITY_WEIGHTS = {
  high: 3,
  medium: 2,
  low: 1,
};

class IntelligentSchedulerTool implements Tool {
  id = 'intelligent_scheduler';
  name = 'IntelligentScheduler';
  nameCn = '智能调度器';
  description = '任务分析、Agent匹配、工作流管理';

  async execute(params: {
    tasks: Task[];
    availableAgents: Agent[];
  }): Promise<{
    success: boolean;
    plan?: WorkflowPlan;
    error?: string;
  }> {
    try {
      const { tasks, availableAgents } = params;

      const sortedTasks = [...tasks].sort((a, b) => {
        const weightDiff = TASK_PRIORITY_WEIGHTS[b.priority] - TASK_PRIORITY_WEIGHTS[a.priority];
        if (weightDiff !== 0) return weightDiff;
        return a.id.localeCompare(b.id);
      });

      const assignments: AgentTaskAssignment[] = availableAgents.map(agent => ({
        agentId: agent.id,
        agentName: agent.nameCn,
        tasks: [],
      }));

      const agentWorkloads = new Map<string, number>();
      availableAgents.forEach(agent => agentWorkloads.set(agent.id, 0));

      for (const task of sortedTasks) {
        const capableAgents = availableAgents.filter(agent => {
          const capabilities = AGENT_CAPABILITIES[agent.id] || [];
          return capabilities.includes(task.type);
        });

        if (capableAgents.length === 0) {
          continue;
        }

        let bestAgent = capableAgents[0];
        let minWorkload = agentWorkloads.get(bestAgent.id) || 0;

        for (const agent of capableAgents.slice(1)) {
          const workload = agentWorkloads.get(agent.id) || 0;
          if (workload < minWorkload) {
            minWorkload = workload;
            bestAgent = agent;
          }
        }

        const assignment = assignments.find(a => a.agentId === bestAgent.id);
        if (assignment) {
          assignment.tasks.push(task);
          agentWorkloads.set(bestAgent.id, minWorkload + (task.estimatedDuration || 30));
        }
      }

      const executionOrder: WorkflowPlan['executionOrder'] = [];
      const taskAgentMap = new Map<string, string>();
      
      assignments.forEach(assignment => {
        assignment.tasks.forEach(task => {
          executionOrder.push({ agentId: assignment.agentId, taskId: task.id });
          taskAgentMap.set(task.id, assignment.agentId);
        });
      });

      for (const task of sortedTasks) {
        if (task.dependencies.length > 0) {
          for (const depId of task.dependencies) {
            const depAgent = taskAgentMap.get(depId);
            if (depAgent) {
              const taskExecution = executionOrder.findIndex(
                e => e.agentId === taskAgentMap.get(task.id) && e.taskId === task.id
              );
              const depExecution = executionOrder.findIndex(
                e => e.agentId === depAgent && e.taskId === depId
              );
              if (taskExecution > 0 && depExecution >= 0 && taskExecution < depExecution) {
                executionOrder.splice(taskExecution, 1);
                executionOrder.push({ agentId: taskAgentMap.get(task.id)!, taskId: task.id });
              }
            }
          }
        }
      }

      const totalDuration = Math.max(...Array.from(agentWorkloads.values()));

      return {
        success: true,
        plan: {
          totalDuration,
          assignments,
          executionOrder,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  analyzeTaskComplexity(task: Task): {
    success: boolean;
    complexity?: 'simple' | 'moderate' | 'complex';
    factors?: string[];
    error?: string;
  } {
    try {
      const factors: string[] = [];
      let complexityScore = 0;

      if (task.dependencies.length > 2) {
        factors.push('多依赖关系');
        complexityScore += 2;
      }

      if (task.type === 'chapter') {
        factors.push('章节创作');
        complexityScore += 2;
      }

      if (task.type === 'revision') {
        factors.push('修订任务');
        complexityScore += 1;
      }

      if (task.estimatedDuration && task.estimatedDuration > 60) {
        factors.push('预估时长较长');
        complexityScore += 1;
      }

      let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
      if (complexityScore >= 4) {
        complexity = 'complex';
      } else if (complexityScore >= 2) {
        complexity = 'moderate';
      }

      return { success: true, complexity, factors };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  suggestOptimization(currentPlan: WorkflowPlan): {
    success: boolean;
    suggestions?: string[];
    estimatedSavings?: number;
    error?: string;
  } {
    try {
      const suggestions: string[] = [];
      let estimatedSavings = 0;

      const agentTaskCounts = currentPlan.assignments.map(a => ({
        agentId: a.agentId,
        count: a.tasks.length,
      }));

      const maxTasks = Math.max(...agentTaskCounts.map(a => a.count));
      const minTasks = Math.min(...agentTaskCounts.map(a => a.count));

      if (maxTasks - minTasks > 3) {
        suggestions.push('任务分配不均，建议重新平衡');
        estimatedSavings += 5;
      }

      const sequentialTasks = currentPlan.executionOrder.filter((e, i) => {
        if (i === 0) return false;
        const prev = currentPlan.executionOrder[i - 1];
        return e.agentId !== prev.agentId;
      });

      if (sequentialTasks.length > currentPlan.executionOrder.length * 0.3) {
        suggestions.push('Agent切换频繁，考虑并行化');
        estimatedSavings += 10;
      }

      return { success: true, suggestions, estimatedSavings };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const intelligentSchedulerTool = new IntelligentSchedulerTool();
