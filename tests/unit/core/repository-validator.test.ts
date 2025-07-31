import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RepositoryValidator } from '../../../src/core/RepositoryValidator';
import * as fileUtils from '../../../src/utils/file';

jest.mock('../../../src/utils/file');

describe('RepositoryValidator', () => {
  let validator: RepositoryValidator;
  const mockFileExists = fileUtils.fileExists as jest.MockedFunction<typeof fileUtils.fileExists>;

  beforeEach(() => {
    validator = new RepositoryValidator();
    jest.clearAllMocks();
  });

  describe('hasClaudeStructure', () => {
    it('should return true when .claude directory exists', async () => {
      mockFileExists.mockResolvedValue(true);

      const result = await validator.hasClaudeStructure('/test/repo');

      expect(mockFileExists).toHaveBeenCalledWith('/test/repo/.claude');
      expect(result).toBe(true);
    });

    it('should return false when .claude directory does not exist', async () => {
      mockFileExists.mockResolvedValue(false);

      const result = await validator.hasClaudeStructure('/test/repo');

      expect(mockFileExists).toHaveBeenCalledWith('/test/repo/.claude');
      expect(result).toBe(false);
    });
  });

  describe('hasTypeDirectories', () => {
    it('should return true when all type directories exist', async () => {
      mockFileExists.mockResolvedValue(true);

      const result = await validator.hasTypeDirectories('/test/repo');

      expect(mockFileExists).toHaveBeenCalledWith('/test/repo/agents');
      expect(mockFileExists).toHaveBeenCalledWith('/test/repo/commands');
      expect(mockFileExists).toHaveBeenCalledWith('/test/repo/hooks');
      expect(result).toBe(true);
    });

    it('should return false when some type directories are missing', async () => {
      mockFileExists
        .mockResolvedValueOnce(true)  // agents exists
        .mockResolvedValueOnce(false) // commands missing
        .mockResolvedValueOnce(true); // hooks exists

      const result = await validator.hasTypeDirectories('/test/repo');

      expect(result).toBe(false);
    });

    it('should return false when all type directories are missing', async () => {
      mockFileExists.mockResolvedValue(false);

      const result = await validator.hasTypeDirectories('/test/repo');

      expect(result).toBe(false);
    });
  });

  describe('validateStructure', () => {
    it('should return success when no types specified and no structure exists', async () => {
      mockFileExists.mockResolvedValue(false);

      const result = await validator.validateStructure('/test/repo');

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return success when types specified and no Claude structure exists', async () => {
      mockFileExists.mockResolvedValue(false);

      const result = await validator.validateStructure('/test/repo', ['agents', 'commands']);

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return error when types specified and .claude directory exists', async () => {
      mockFileExists.mockImplementation(async (path) => {
        return path.endsWith('/.claude');
      });

      const result = await validator.validateStructure('/test/repo', ['agents']);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        code: 'STRUCTURE_CONFLICT',
        message: 'Cannot use --type with existing .claude directory structure'
      });
    });

    it('should return error when types specified and type directories exist', async () => {
      mockFileExists.mockImplementation(async (path) => {
        return path.endsWith('/agents') || path.endsWith('/commands') || path.endsWith('/hooks');
      });

      const result = await validator.validateStructure('/test/repo', ['commands']);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        code: 'STRUCTURE_CONFLICT',
        message: 'Cannot use --type with existing type directories (agents/, commands/, hooks/)'
      });
    });

    it('should return multiple errors when both structures exist', async () => {
      mockFileExists.mockResolvedValue(true);

      const result = await validator.validateStructure('/test/repo', ['hooks']);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContainEqual({
        code: 'STRUCTURE_CONFLICT',
        message: 'Cannot use --type with existing .claude directory structure'
      });
      expect(result.errors).toContainEqual({
        code: 'STRUCTURE_CONFLICT',
        message: 'Cannot use --type with existing type directories (agents/, commands/, hooks/)'
      });
    });
  });
});