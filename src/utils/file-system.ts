import fs from 'fs/promises';
import { existsSync, createReadStream, createWriteStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import crypto from 'crypto';

/**
 * ディレクトリが存在しない場合は作成
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * ファイルが存在するかチェック
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * ファイルを読み込んでJSONとしてパース
 */
export async function readJsonFile<T = any>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * オブジェクトをJSONファイルとして保存
 */
export async function writeJsonFile(filePath: string, data: any, indent = 2): Promise<void> {
  const content = JSON.stringify(data, null, indent);
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * ファイルをコピー
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

/**
 * ディレクトリを再帰的にコピー
 */
export async function copyDirectory(src: string, dest: string): Promise<void> {
  await ensureDir(dest);
  
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

/**
 * ファイルを移動
 */
export async function moveFile(src: string, dest: string): Promise<void> {
  await ensureDir(path.dirname(dest));
  await fs.rename(src, dest);
}

/**
 * ファイルまたはディレクトリを削除
 */
export async function remove(filePath: string): Promise<void> {
  try {
    await fs.rm(filePath, { recursive: true, force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * ディレクトリ内のファイルを再帰的に取得
 */
export async function getAllFiles(dirPath: string, pattern?: RegExp): Promise<string[]> {
  const files: string[] = [];
  
  async function traverse(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else if (!pattern || pattern.test(fullPath)) {
        files.push(fullPath);
      }
    }
  }
  
  await traverse(dirPath);
  return files;
}

/**
 * ファイルのハッシュ値を計算
 */
export async function getFileHash(filePath: string, algorithm = 'sha256'): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * テンポラリファイルを作成
 */
export async function createTempFile(prefix = 'temp', extension = ''): Promise<string> {
  const tmpDir = path.join(process.cwd(), '.tmp');
  await ensureDir(tmpDir);
  
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2)}${extension}`;
  return path.join(tmpDir, fileName);
}

/**
 * ファイルサイズを取得
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * ファイルの最終更新日時を取得
 */
export async function getLastModified(filePath: string): Promise<Date> {
  const stats = await fs.stat(filePath);
  return stats.mtime;
}

/**
 * 大きなファイルをストリームでコピー
 */
export async function copyLargeFile(src: string, dest: string): Promise<void> {
  await ensureDir(path.dirname(dest));
  const readStream = createReadStream(src);
  const writeStream = createWriteStream(dest);
  await pipeline(readStream, writeStream);
}

/**
 * ファイルの行数を取得
 */
export async function getLineCount(filePath: string): Promise<number> {
  const content = await fs.readFile(filePath, 'utf-8');
  return content.split('\n').length;
}