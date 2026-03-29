import { Tool } from './toolManager';

export interface WordCountResult {
  chineseChars: number;
  englishWords: number;
  numbers: number;
  spaces: number;
  totalChars: number;
  paragraphs: number;
  sentences: number;
}

export interface WordCountCompliance {
  isCompliant: boolean;
  current: number;
  required?: number;
  message: string;
}

class WordCountTool implements Tool {
  id = 'word_counter';
  name = 'WordCounter';
  nameCn = '字数统计工具';
  description = '精准字数统计、字数合规校验';

  async execute(params: { text: string; requiredWordCount?: number }): Promise<{
    success: boolean;
    result?: WordCountResult;
    compliance?: WordCountCompliance;
    error?: string;
  }> {
    try {
      const { text, requiredWordCount } = params;

      const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
      const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
      const numbers = (text.match(/\d+/g) || []).join('').length;
      const spaces = (text.match(/\s/g) || []).length;
      const totalChars = text.length;
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim()).length;
      const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim()).length;

      const result: WordCountResult = {
        chineseChars,
        englishWords,
        numbers,
        spaces,
        totalChars,
        paragraphs,
        sentences,
      };

      let compliance: WordCountCompliance | undefined;
      if (requiredWordCount !== undefined) {
        const isCompliant = chineseChars >= requiredWordCount;
        compliance = {
          isCompliant,
          current: chineseChars,
          required: requiredWordCount,
          message: isCompliant
            ? `字数达标 (${chineseChars}/${requiredWordCount})`
            : `字数不足 (${chineseChars}/${requiredWordCount})，还需 ${requiredWordCount - chineseChars} 字`,
        };
      }

      return { success: true, result, compliance };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getWordCountByChapter(chapters: { title: string; content: string }[]): {
    success: boolean;
    results?: { title: string; wordCount: number }[];
    total?: number;
    error?: string;
  } {
    try {
      const results = chapters.map(chapter => ({
        title: chapter.title,
        wordCount: (chapter.content.match(/[\u4e00-\u9fa5]/g) || []).length,
      }));

      const total = results.reduce((sum, r) => sum + r.wordCount, 0);

      return { success: true, results, total };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  suggestWordCountAllocation(
    totalTarget: number,
    chapterCount: number
  ): {
    success: boolean;
    suggestion?: { chapter: number; min: number; max: number; target: number }[];
    error?: string;
  } {
    try {
      const avgPerChapter = Math.floor(totalTarget / chapterCount);
      const variance = Math.floor(avgPerChapter * 0.2);

      const suggestion = Array.from({ length: chapterCount }, (_, i) => ({
        chapter: i + 1,
        min: avgPerChapter - variance,
        max: avgPerChapter + variance,
        target: avgPerChapter,
      }));

      return { success: true, suggestion };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const wordCountTool = new WordCountTool();
