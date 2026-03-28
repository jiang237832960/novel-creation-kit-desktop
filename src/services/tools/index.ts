export * from './toolManager';
export * from './textReader';
export * from './wordCounter';
export * from './novelValidator';
export * from './intelligentScheduler';
export * from './selfLearning';
export * from './textAnalyzer';

import { toolManager, TOOL_IDS } from './toolManager';
import { textReaderTool } from './textReader';
import { wordCountTool } from './wordCounter';
import { novelValidatorTool } from './novelValidator';
import { intelligentSchedulerTool } from './intelligentScheduler';
import { selfLearningTool } from './selfLearning';
import { textAnalyzerTool } from './textAnalyzer';

export function initializeTools(): void {
  toolManager.registerTools([
    textReaderTool,
    wordCountTool,
    novelValidatorTool,
    intelligentSchedulerTool,
    selfLearningTool,
    textAnalyzerTool,
  ]);

  toolManager.bindToolsToAgent('archivist', [TOOL_IDS.TEXT_READER]);
  toolManager.bindToolsToAgent('verifier', [TOOL_IDS.TEXT_READER, TOOL_IDS.NOVEL_VALIDATOR]);
  toolManager.bindToolsToAgent('wordcount', [TOOL_IDS.WORD_COUNTER]);
  toolManager.bindToolsToAgent('chief-director', [TOOL_IDS.INTELLIGENT_SCHEDULER]);
  toolManager.bindToolsToAgent('learning', [TOOL_IDS.SELF_LEARNING, TOOL_IDS.TEXT_ANALYZER]);
  toolManager.bindToolsToAgent('stylist', [TOOL_IDS.TEXT_ANALYZER]);
  toolManager.bindToolsToAgent('polisher', [TOOL_IDS.TEXT_ANALYZER, TOOL_IDS.NOVEL_VALIDATOR]);
}

export const TOOLS = {
  toolManager,
  textReader: textReaderTool,
  wordCounter: wordCountTool,
  novelValidator: novelValidatorTool,
  intelligentScheduler: intelligentSchedulerTool,
  selfLearning: selfLearningTool,
  textAnalyzer: textAnalyzerTool,
};
