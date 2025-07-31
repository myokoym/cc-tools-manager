import { ValidationResult, ValidationError } from '../types/deployment';
import { fileExists } from '../utils/file-system';
import * as path from 'path';

export class RepositoryValidator {
  async hasClaudeStructure(repoPath: string): Promise<boolean> {
    return await fileExists(path.join(repoPath, '.claude'));
  }

  async hasTypeDirectories(repoPath: string): Promise<boolean> {
    const typeDirectories = ['agents', 'commands', 'hooks'];
    
    for (const dir of typeDirectories) {
      const exists = await fileExists(path.join(repoPath, dir));
      if (!exists) {
        return false;
      }
    }
    
    return true;
  }

  async validateStructure(repoPath: string, types?: string[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // タイプが指定されている場合のみ、既存構造との競合をチェック
    if (types && types.length > 0) {
      // .claude ディレクトリの存在チェック
      if (await this.hasClaudeStructure(repoPath)) {
        errors.push({
          code: 'STRUCTURE_CONFLICT',
          message: 'Cannot use --type with existing .claude directory structure',
          suggestion: 'Remove --type flag or use a repository without .claude directory'
        });
      }

      // type ディレクトリの存在チェック
      if (await this.hasTypeDirectories(repoPath)) {
        errors.push({
          code: 'STRUCTURE_CONFLICT',
          message: 'Cannot use --type with existing type directories (agents/, commands/, hooks/)',
          suggestion: 'Remove --type flag or use a repository without type directories'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      detectedStructures: {
        hasClaudeDir: await this.hasClaudeStructure(repoPath),
        hasTypeDirectories: [],
        hasMdFiles: false
      }
    };
  }
}