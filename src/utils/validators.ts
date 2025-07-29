import { URL } from 'url';
import path from 'path';
import fs from 'fs';

/**
 * URLが有効かどうかを検証
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * GitHubのURLかどうかを検証
 */
export function isGitHubUrl(urlString: string): boolean {
  if (!isValidUrl(urlString)) return false;
  
  try {
    const url = new URL(urlString);
    return url.hostname === 'github.com' || url.hostname === 'www.github.com';
  } catch {
    return false;
  }
}

/**
 * GitHubリポジトリURLから所有者とリポジトリ名を抽出
 */
export function parseGitHubUrl(urlString: string): { owner: string; repo: string } | null {
  if (!isGitHubUrl(urlString)) return null;
  
  try {
    const url = new URL(urlString);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    if (pathParts.length >= 2) {
      return {
        owner: pathParts[0],
        repo: pathParts[1].replace('.git', ''),
      };
    }
  } catch {
    // エラー処理
  }
  
  return null;
}

/**
 * ファイルパスが存在するかを検証
 */
export function isValidFilePath(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * ディレクトリパスが存在するかを検証
 */
export function isValidDirectoryPath(dirPath: string): boolean {
  try {
    const stats = fs.statSync(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * パスが絶対パスかどうかを検証
 */
export function isAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

/**
 * ファイルパスが安全かどうかを検証（ディレクトリトラバーサル対策）
 */
export function isSafePath(filePath: string, basePath: string): boolean {
  const normalizedPath = path.normalize(filePath);
  const resolvedPath = path.resolve(basePath, normalizedPath);
  const resolvedBasePath = path.resolve(basePath);
  
  return resolvedPath.startsWith(resolvedBasePath);
}

/**
 * ファイル拡張子を検証
 */
export function hasValidExtension(filePath: string, allowedExtensions: string[]): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return allowedExtensions.includes(ext);
}

/**
 * JSONが有効かどうかを検証
 */
export function isValidJson(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

/**
 * 文字列が空でないかを検証
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 数値が有効な範囲内かを検証
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * メールアドレスの基本的な検証
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * セマンティックバージョンの検証
 */
export function isValidSemver(version: string): boolean {
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  return semverRegex.test(version);
}

/**
 * パスの検証（エイリアス）
 */
export function validatePath(filePath: string): boolean {
  return isValidFilePath(filePath);
}