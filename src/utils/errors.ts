/**
 * 基本的なカスタムエラークラス
 */
export class BaseError extends Error {
  public readonly isOperational: boolean;
  public readonly statusCode: number;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();

    // スタックトレースを正しく設定
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 検証エラー
 */
export class ValidationError extends BaseError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(message: string, field?: string, value?: any) {
    super(message, 400, true);
    this.field = field;
    this.value = value;
  }
}

/**
 * 認証エラー
 */
export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, true);
  }
}

/**
 * 権限エラー
 */
export class AuthorizationError extends BaseError {
  constructor(message: string = 'Permission denied') {
    super(message, 403, true);
  }
}

/**
 * リソースが見つからないエラー
 */
export class NotFoundError extends BaseError {
  public readonly resource?: string;
  public readonly id?: string | number;

  constructor(resource?: string, id?: string | number) {
    const message = resource
      ? `${resource} ${id ? `with id ${id} ` : ''}not found`
      : 'Resource not found';
    super(message, 404, true);
    this.resource = resource;
    this.id = id;
  }
}

/**
 * 競合エラー
 */
export class ConflictError extends BaseError {
  public readonly conflictingResource?: string;

  constructor(message: string, conflictingResource?: string) {
    super(message, 409, true);
    this.conflictingResource = conflictingResource;
  }
}

/**
 * ネットワークエラー
 */
export class NetworkError extends BaseError {
  public readonly url?: string;
  public readonly method?: string;

  constructor(message: string, url?: string, method?: string) {
    super(message, 503, true);
    this.url = url;
    this.method = method;
  }
}

/**
 * タイムアウトエラー
 */
export class TimeoutError extends BaseError {
  public readonly timeout: number;

  constructor(message: string, timeout: number) {
    super(message, 408, true);
    this.timeout = timeout;
  }
}

/**
 * ファイルシステムエラー
 */
export class FileSystemError extends BaseError {
  public readonly path?: string;
  public readonly operation?: string;

  constructor(message: string, path?: string, operation?: string) {
    super(message, 500, true);
    this.path = path;
    this.operation = operation;
  }
}

/**
 * 設定エラー
 */
export class ConfigurationError extends BaseError {
  public readonly configKey?: string;

  constructor(message: string, configKey?: string) {
    super(message, 500, false);
    this.configKey = configKey;
  }
}

/**
 * 外部サービスエラー
 */
export class ExternalServiceError extends BaseError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(service: string, message: string, originalError?: Error) {
    super(`${service}: ${message}`, 502, true);
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * エラーが操作的かどうかを判定
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof BaseError) {
    return error.isOperational;
  }
  return false;
}

/**
 * エラーをBaseErrorに変換
 */
export function toBaseError(error: unknown): BaseError {
  if (error instanceof BaseError) {
    return error;
  }

  if (error instanceof Error) {
    return new BaseError(error.message, 500, false);
  }

  return new BaseError(String(error), 500, false);
}

/**
 * 複数のエラーを集約
 */
export class AggregateError extends BaseError {
  public readonly errors: Error[];

  constructor(errors: Error[], message?: string) {
    const errorMessages = errors.map(e => e.message).join('; ');
    super(message || `Multiple errors occurred: ${errorMessages}`, 500, true);
    this.errors = errors;
  }
}

/**
 * Gitクローンエラー
 */
export class GitCloneError extends BaseError {
  constructor(message: string) {
    super(message, 500, true);
  }
}

/**
 * Git認証エラー
 */
export class GitAuthError extends BaseError {
  constructor(message: string) {
    super(message, 401, true);
  }
}

/**
 * Git Pull エラー
 */
export class GitPullError extends BaseError {
  constructor(message: string) {
    super(message, 500, true);
  }
}

/**
 * Git Status エラー
 */
export class GitStatusError extends BaseError {
  constructor(message: string) {
    super(message, 500, true);
  }
}

/**
 * Git Commit エラー
 */
export class GitCommitError extends BaseError {
  constructor(message: string) {
    super(message, 500, true);
  }
}

/**
 * リポジトリが見つからないエラー
 */
export class RepoNotFoundError extends BaseError {
  constructor(message: string) {
    super(message, 404, true);
  }
}

/**
 * インストールエラー
 */
export class InstallationError extends BaseError {
  public readonly code: string;
  public readonly repository?: string;
  public readonly recoverable: boolean;

  constructor(
    code: string,
    message: string,
    repository?: string,
    recoverable: boolean = false
  ) {
    super(message, 500, true);
    this.code = code;
    this.repository = repository;
    this.recoverable = recoverable;
  }

  toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}

/**
 * 状態破損エラー
 */
export class StateCorruptionError extends BaseError {
  public readonly code: string = 'STATE_CORRUPTION';
  public readonly stateFile?: string;
  public readonly backup?: string;

  constructor(
    message: string,
    stateFile?: string,
    backup?: string
  ) {
    super(message, 500, true);
    this.stateFile = stateFile;
    this.backup = backup;
  }
}

/**
 * エラーファクトリー関数
 */
export function createError(type: string, message: string, options?: any): BaseError {
  switch (type) {
    case 'GIT_CLONE_ERROR':
      return new GitCloneError(message);
    case 'GIT_AUTH_ERROR':
      return new GitAuthError(message);
    case 'GIT_PULL_ERROR':
      return new GitPullError(message);
    case 'GIT_STATUS_ERROR':
      return new GitStatusError(message);
    case 'GIT_COMMIT_ERROR':
      return new GitCommitError(message);
    case 'REPO_NOT_FOUND':
      return new RepoNotFoundError(message);
    case 'INSTALLATION_ERROR':
      return new InstallationError(
        options?.code || 'UNKNOWN_ERROR',
        message,
        options?.repository,
        options?.recoverable
      );
    case 'STATE_CORRUPTION_ERROR':
      return new StateCorruptionError(
        message,
        options?.stateFile,
        options?.backup
      );
    default:
      return new BaseError(message);
  }
}