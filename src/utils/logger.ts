import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { CCPM_HOME, LOGS_DIR } from '../constants/paths';

// ログディレクトリの遅延作成
let logDirCreated = false;
const ensureLogDirectory = () => {
  if (!logDirCreated && !fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    logDirCreated = true;
  }
  return LOGS_DIR;
};

// カスタムログフォーマット
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// コンソール用フォーマット
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// ロガーインスタンスの遅延作成
let logger: winston.Logger | null = null;
let fileTransportsAdded = false;

const getLogger = (): winston.Logger => {
  if (!logger) {
    logger = winston.createLogger({
      level: process.env.CCPM_LOG_LEVEL || 'error', // デフォルトをerrorに変更
      format: customFormat,
      defaultMeta: { service: 'ccpm' },
      transports: [],
    });

    // コンソール出力の制御
    const enableConsoleLog = process.env.CCPM_LOG_CONSOLE === 'true' || 
                           process.env.NODE_ENV === 'development';
    
    if (enableConsoleLog && process.env.NODE_ENV !== 'production') {
      logger.add(
        new winston.transports.Console({
          format: consoleFormat,
        })
      );
    }
  }

  // ファイルトランスポートの遅延追加
  if (!fileTransportsAdded && process.env.CCPM_LOG_FILE !== 'false') {
    const shouldAddFileTransports = logger.level !== 'silent' && logger.level !== 'none';
    if (shouldAddFileTransports) {
      const logDir = ensureLogDirectory();
      logger.add(new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }));
      logger.add(new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }));
      fileTransportsAdded = true;
    }
  }

  return logger;
};

// テスト環境では出力を無効化
if (process.env.NODE_ENV === 'test') {
  const testLogger = getLogger();
  testLogger.transports.forEach((transport) => {
    transport.silent = true;
  });
}

// Loggerクラスのラッパー
export class Logger {
  info(message: string, meta?: any) {
    getLogger().info(message, meta);
  }

  error(message: string, error?: Error | any) {
    const logger = getLogger();
    if (error instanceof Error) {
      logger.error(message, { error: error.message, stack: error.stack });
    } else {
      logger.error(message, error);
    }
  }

  warn(message: string, meta?: any) {
    getLogger().warn(message, meta);
  }

  debug(message: string, meta?: any) {
    getLogger().debug(message, meta);
  }
}

// 遅延初期化されたloggerのプロキシ
const loggerProxy = new Proxy({} as winston.Logger, {
  get(_target, prop) {
    const actualLogger = getLogger();
    return actualLogger[prop as keyof winston.Logger];
  }
});

export default loggerProxy;

// 名前付きエクスポートとして logger を追加
export { loggerProxy as logger };

// 便利なメソッドのエクスポート
export const logInfo = (message: string, meta?: any) => getLogger().info(message, meta);
export const logError = (message: string, error?: Error | any) => {
  const logger = getLogger();
  if (error instanceof Error) {
    logger.error(message, { error: error.message, stack: error.stack });
  } else {
    logger.error(message, error);
  }
};
export const logWarn = (message: string, meta?: any) => getLogger().warn(message, meta);
export const logDebug = (message: string, meta?: any) => getLogger().debug(message, meta);