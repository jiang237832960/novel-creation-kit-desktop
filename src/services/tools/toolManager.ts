export interface Tool {
  id: string;
  name: string;
  nameCn: string;
  description: string;
  execute: (params: any) => Promise<any>;
}

export interface AgentToolBinding {
  agentId: string;
  toolIds: string[];
}

class ToolManager {
  private tools: Map<string, Tool> = new Map();
  private bindings: Map<string, string[]> = new Map();

  registerTool(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }

  registerTools(tools: Tool[]): void {
    tools.forEach(tool => this.registerTool(tool));
  }

  getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  bindToolsToAgent(agentId: string, toolIds: string[]): void {
    this.bindings.set(agentId, toolIds);
  }

  getToolsForAgent(agentId: string): Tool[] {
    const toolIds = this.bindings.get(agentId) || [];
    return toolIds.map(id => this.tools.get(id)).filter((t): t is Tool => t !== undefined);
  }

  unbindAgent(agentId: string): void {
    this.bindings.delete(agentId);
  }

  getBindings(): AgentToolBinding[] {
    return Array.from(this.bindings.entries()).map(([agentId, toolIds]) => ({
      agentId,
      toolIds,
    }));
  }
}

export const toolManager = new ToolManager();

export const TOOL_IDS = {
  TEXT_READER: 'text_reader',
  WORD_COUNTER: 'word_counter',
  NOVEL_VALIDATOR: 'novel_validator',
  INTELLIGENT_SCHEDULER: 'intelligent_scheduler',
  SELF_LEARNING: 'self_learning',
  TEXT_ANALYZER: 'text_analyzer',
} as const;

export type ToolId = typeof TOOL_IDS[keyof typeof TOOL_IDS];
