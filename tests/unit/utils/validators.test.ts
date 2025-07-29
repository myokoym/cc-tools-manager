import * as validators from '../../../src/utils/validators';
import fs from 'fs';
import path from 'path';

jest.mock('fs');

describe('Validators', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidUrl', () => {
    it('有効なHTTP URLを検証', () => {
      expect(validators.isValidUrl('http://example.com')).toBe(true);
      expect(validators.isValidUrl('https://example.com')).toBe(true);
      expect(validators.isValidUrl('https://example.com/path?query=1')).toBe(true);
    });

    it('無効なURLを検証', () => {
      expect(validators.isValidUrl('not-a-url')).toBe(false);
      expect(validators.isValidUrl('ftp://example.com')).toBe(false);
      expect(validators.isValidUrl('')).toBe(false);
    });
  });

  describe('isGitHubUrl', () => {
    it('GitHubのURLを検証', () => {
      expect(validators.isGitHubUrl('https://github.com/owner/repo')).toBe(true);
      expect(validators.isGitHubUrl('https://www.github.com/owner/repo')).toBe(true);
      expect(validators.isGitHubUrl('http://github.com/owner/repo')).toBe(true);
    });

    it('GitHub以外のURLを検証', () => {
      expect(validators.isGitHubUrl('https://gitlab.com/owner/repo')).toBe(false);
      expect(validators.isGitHubUrl('https://example.com')).toBe(false);
      expect(validators.isGitHubUrl('invalid-url')).toBe(false);
    });
  });

  describe('parseGitHubUrl', () => {
    it('GitHubのURLから所有者とリポジトリ名を抽出', () => {
      expect(validators.parseGitHubUrl('https://github.com/owner/repo')).toEqual({
        owner: 'owner',
        repo: 'repo',
      });
      expect(validators.parseGitHubUrl('https://github.com/owner/repo.git')).toEqual({
        owner: 'owner',
        repo: 'repo',
      });
    });

    it('無効なURLの場合はnullを返す', () => {
      expect(validators.parseGitHubUrl('https://gitlab.com/owner/repo')).toBeNull();
      expect(validators.parseGitHubUrl('https://github.com/owner')).toBeNull();
      expect(validators.parseGitHubUrl('invalid-url')).toBeNull();
    });
  });

  describe('isValidFilePath', () => {
    it('存在するファイルパスを検証', () => {
      mockFs.existsSync.mockReturnValue(true);
      expect(validators.isValidFilePath('/path/to/file')).toBe(true);
      expect(mockFs.existsSync).toHaveBeenCalledWith('/path/to/file');
    });

    it('存在しないファイルパスを検証', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(validators.isValidFilePath('/path/to/file')).toBe(false);
    });

    it('エラーが発生した場合はfalseを返す', () => {
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      expect(validators.isValidFilePath('/path/to/file')).toBe(false);
    });
  });

  describe('isValidDirectoryPath', () => {
    it('存在するディレクトリパスを検証', () => {
      mockFs.statSync.mockReturnValue({
        isDirectory: () => true,
      } as any);
      expect(validators.isValidDirectoryPath('/path/to/dir')).toBe(true);
    });

    it('ファイルパスの場合はfalseを返す', () => {
      mockFs.statSync.mockReturnValue({
        isDirectory: () => false,
      } as any);
      expect(validators.isValidDirectoryPath('/path/to/file')).toBe(false);
    });

    it('存在しないパスの場合はfalseを返す', () => {
      mockFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      expect(validators.isValidDirectoryPath('/path/to/dir')).toBe(false);
    });
  });

  describe('isAbsolutePath', () => {
    it('絶対パスを検証', () => {
      expect(validators.isAbsolutePath('/absolute/path')).toBe(true);
      expect(validators.isAbsolutePath('C:\\Windows\\System32')).toBe(process.platform === 'win32');
    });

    it('相対パスを検証', () => {
      expect(validators.isAbsolutePath('relative/path')).toBe(false);
      expect(validators.isAbsolutePath('./relative/path')).toBe(false);
      expect(validators.isAbsolutePath('../relative/path')).toBe(false);
    });
  });

  describe('isSafePath', () => {
    it('安全なパスを検証', () => {
      const basePath = '/home/user/project';
      expect(validators.isSafePath('subdir/file.txt', basePath)).toBe(true);
      expect(validators.isSafePath('./subdir/file.txt', basePath)).toBe(true);
    });

    it('ディレクトリトラバーサルを検出', () => {
      const basePath = '/home/user/project';
      expect(validators.isSafePath('../../../etc/passwd', basePath)).toBe(false);
      expect(validators.isSafePath('subdir/../../..', basePath)).toBe(false);
    });
  });

  describe('hasValidExtension', () => {
    it('許可された拡張子を検証', () => {
      const allowed = ['.js', '.ts', '.json'];
      expect(validators.hasValidExtension('file.js', allowed)).toBe(true);
      expect(validators.hasValidExtension('file.TS', allowed)).toBe(true);
      expect(validators.hasValidExtension('/path/to/file.json', allowed)).toBe(true);
    });

    it('許可されていない拡張子を検証', () => {
      const allowed = ['.js', '.ts'];
      expect(validators.hasValidExtension('file.py', allowed)).toBe(false);
      expect(validators.hasValidExtension('file', allowed)).toBe(false);
    });
  });

  describe('isValidJson', () => {
    it('有効なJSONを検証', () => {
      expect(validators.isValidJson('{"key": "value"}')).toBe(true);
      expect(validators.isValidJson('[]')).toBe(true);
      expect(validators.isValidJson('"string"')).toBe(true);
      expect(validators.isValidJson('123')).toBe(true);
    });

    it('無効なJSONを検証', () => {
      expect(validators.isValidJson('{key: "value"}')).toBe(false);
      expect(validators.isValidJson('undefined')).toBe(false);
      expect(validators.isValidJson('')).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('空でない文字列を検証', () => {
      expect(validators.isNonEmptyString('hello')).toBe(true);
      expect(validators.isNonEmptyString(' text ')).toBe(true);
    });

    it('空の文字列や非文字列を検証', () => {
      expect(validators.isNonEmptyString('')).toBe(false);
      expect(validators.isNonEmptyString('   ')).toBe(false);
      expect(validators.isNonEmptyString(null)).toBe(false);
      expect(validators.isNonEmptyString(undefined)).toBe(false);
      expect(validators.isNonEmptyString(123)).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('範囲内の値を検証', () => {
      expect(validators.isInRange(5, 1, 10)).toBe(true);
      expect(validators.isInRange(1, 1, 10)).toBe(true);
      expect(validators.isInRange(10, 1, 10)).toBe(true);
    });

    it('範囲外の値を検証', () => {
      expect(validators.isInRange(0, 1, 10)).toBe(false);
      expect(validators.isInRange(11, 1, 10)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('有効なメールアドレスを検証', () => {
      expect(validators.isValidEmail('user@example.com')).toBe(true);
      expect(validators.isValidEmail('user.name@example.co.jp')).toBe(true);
      expect(validators.isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('無効なメールアドレスを検証', () => {
      expect(validators.isValidEmail('invalid')).toBe(false);
      expect(validators.isValidEmail('@example.com')).toBe(false);
      expect(validators.isValidEmail('user@')).toBe(false);
      expect(validators.isValidEmail('user @example.com')).toBe(false);
    });
  });

  describe('isValidSemver', () => {
    it('有効なセマンティックバージョンを検証', () => {
      expect(validators.isValidSemver('1.0.0')).toBe(true);
      expect(validators.isValidSemver('1.2.3')).toBe(true);
      expect(validators.isValidSemver('1.0.0-alpha')).toBe(true);
      expect(validators.isValidSemver('1.0.0-alpha.1')).toBe(true);
      expect(validators.isValidSemver('1.0.0+build')).toBe(true);
      expect(validators.isValidSemver('1.0.0-rc.1+build')).toBe(true);
    });

    it('無効なセマンティックバージョンを検証', () => {
      expect(validators.isValidSemver('1.0')).toBe(false);
      expect(validators.isValidSemver('v1.0.0')).toBe(false);
      expect(validators.isValidSemver('1.0.0.')).toBe(false);
      expect(validators.isValidSemver('1.0.0-')).toBe(false);
    });
  });
});