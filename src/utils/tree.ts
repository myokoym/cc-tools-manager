import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';

/**
 * ファイルパスをツリー構造のノードに変換するためのインターフェース
 */
interface TreeNode {
  name: string;
  fullPath: string;
  deployedAt?: string;
  children: Map<string, TreeNode>;
}

/**
 * デプロイされたファイルの情報
 */
interface DeployedFileInfo {
  target: string;
  deployedAt: string;
}

/**
 * パスをホームディレクトリ相対表記に変換
 */
export function formatPathWithHome(filePath: string): string {
  const homedir = os.homedir();
  if (filePath.startsWith(homedir)) {
    return filePath.replace(homedir, '~');
  }
  return filePath;
}

/**
 * ファイルパスの配列からツリー構造を構築
 */
export function buildFileTree(files: DeployedFileInfo[]): TreeNode {
  const root: TreeNode = {
    name: '',
    fullPath: '',
    children: new Map()
  };

  for (const file of files) {
    const formattedPath = formatPathWithHome(file.target);
    const parts = formattedPath.split(path.sep).filter(p => p !== '');
    
    let currentNode = root;
    let currentPath = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? path.join(currentPath, part) : part;
      
      if (!currentNode.children.has(part)) {
        currentNode.children.set(part, {
          name: part,
          fullPath: currentPath,
          deployedAt: i === parts.length - 1 ? file.deployedAt : undefined,
          children: new Map()
        });
      }
      
      currentNode = currentNode.children.get(part)!;
    }
  }
  
  return root;
}

/**
 * ツリー構造を文字列として描画
 */
export function renderTree(node: TreeNode, prefix: string = '', isLast: boolean = true, isRoot: boolean = true): string[] {
  const lines: string[] = [];
  
  if (!isRoot) {
    const connector = isLast ? '└── ' : '├── ';
    const nodeDisplay = node.deployedAt 
      ? `${node.name} ${chalk.gray(`(${new Date(node.deployedAt).toLocaleDateString('ja-JP')} ${new Date(node.deployedAt).toLocaleTimeString('ja-JP')})`)}`
      : node.name + '/';
    
    lines.push(prefix + connector + chalk.cyan(nodeDisplay));
  }
  
  const children = Array.from(node.children.values());
  const childPrefix = prefix + (isRoot ? '' : (isLast ? '    ' : '│   '));
  
  children.forEach((child, index) => {
    const isLastChild = index === children.length - 1;
    lines.push(...renderTree(child, childPrefix, isLastChild, false));
  });
  
  return lines;
}

/**
 * デプロイされたファイルをツリー形式で表示するための文字列を生成
 */
export function generateDeployedFilesTree(files: DeployedFileInfo[]): string[] {
  if (files.length === 0) {
    return [];
  }
  
  const tree = buildFileTree(files);
  const lines: string[] = ['  Deployed Files:'];
  
  // ルートの直下の子ノードから描画を開始
  const rootChildren = Array.from(tree.children.values());
  rootChildren.forEach((child, index) => {
    const isLast = index === rootChildren.length - 1;
    lines.push(...renderTree(child, '    ', isLast, false));
  });
  
  return lines;
}