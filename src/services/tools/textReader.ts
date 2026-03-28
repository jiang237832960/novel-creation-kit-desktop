import { Tool } from './toolManager';

export interface TextReaderOptions {
  encoding?: string;
  maxChunkSize?: number;
}

export interface TextReadResult {
  success: boolean;
  content?: string;
  chunks?: string[];
  lineCount?: number;
  charCount?: number;
  error?: string;
}

class TextReaderTool implements Tool {
  id = 'text_reader';
  name = 'TextReader';
  nameCn = '通用文本读取器';
  description = '多格式文本读取、大文件分块读取';

  async execute(params: {
    filePath: string;
    options?: TextReaderOptions;
  }): Promise<TextReadResult> {
    try {
      const { filePath, options = {} } = params;
      const { maxChunkSize = 10000 } = options;

      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' };
      }

      const result = await window.electronAPI.readFile(filePath);
      
      if (!result.success || !result.content) {
        return { success: false, error: result.error || 'Failed to read file' };
      }

      const content = result.content;
      const chunks: string[] = [];
      
      if (content.length > maxChunkSize) {
        for (let i = 0; i < content.length; i += maxChunkSize) {
          chunks.push(content.slice(i, i + maxChunkSize));
        }
      } else {
        chunks.push(content);
      }

      return {
        success: true,
        content,
        chunks,
        lineCount: content.split('\n').length,
        charCount: content.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async readDirectory(dirPath: string): Promise<{
    success: boolean;
    entries?: { name: string; path: string; isDirectory: boolean }[];
    error?: string;
  }> {
    if (!window.electronAPI) {
      return { success: false, error: 'Electron API not available' };
    }

    return window.electronAPI.listDirectory(dirPath);
  }

  async searchInFile(filePath: string, keyword: string): Promise<{
    success: boolean;
    matches?: { line: number; content: string }[];
    error?: string;
  }> {
    try {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' };
      }

      const result = await window.electronAPI.readFile(filePath);
      if (!result.success || !result.content) {
        return { success: false, error: result.error };
      }

      const lines = result.content.split('\n');
      const matches: { line: number; content: string }[] = [];
      const regex = new RegExp(keyword, 'gi');

      lines.forEach((line, index) => {
        if (regex.test(line)) {
          matches.push({ line: index + 1, content: line.trim() });
        }
        regex.lastIndex = 0;
      });

      return { success: true, matches };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const textReaderTool = new TextReaderTool();
