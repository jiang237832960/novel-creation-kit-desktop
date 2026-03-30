/**
 * 记忆系统导出
 */

export { ThreeLayerMemorySystem, MemoryLayer, MEMORY_BUDGET_RATIOS } from './threeLayerMemory';
export { ForeshadowingTracker } from './foreshadowingTracker';

import { ThreeLayerMemorySystem } from './threeLayerMemory';
import { ForeshadowingTracker } from './foreshadowingTracker';

export interface MemorySystem {
  threeLayer: ThreeLayerMemorySystem;
  foreshadowing: ForeshadowingTracker;
}

/**
 * 创建项目的记忆系统实例
 */
export function createMemorySystem(projectPath: string, projectId: string): MemorySystem {
  return {
    threeLayer: new ThreeLayerMemorySystem(projectPath),
    foreshadowing: new ForeshadowingTracker(projectId)
  };
}
