// 検証結果
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  detectedStructures: {
    hasClaudeDir: boolean;
    hasTypeDirectories: string[];
    hasMdFiles: boolean;
  };
}

// 検証エラー
export interface ValidationError {
  code: 'STRUCTURE_CONFLICT' | 'NO_DEPLOYABLE_FILES' | 'INVALID_TYPE';
  message: string;
  suggestion: string;
}