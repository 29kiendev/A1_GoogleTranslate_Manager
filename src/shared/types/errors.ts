export const AppErrorCode = {
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  DB_ERROR: 'DB_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_FOLDER: 'DUPLICATE_FOLDER',
  INVALID_FOLDER_MOVE: 'INVALID_FOLDER_MOVE',
  IMPORT_INVALID_FILE: 'IMPORT_INVALID_FILE',
  IMPORT_SCHEMA_UNSUPPORTED: 'IMPORT_SCHEMA_UNSUPPORTED',
  CAPTURE_EMPTY_TRANSLATION: 'CAPTURE_EMPTY_TRANSLATION',
  CAPTURE_DOM_CHANGED: 'CAPTURE_DOM_CHANGED',
  CLIPBOARD_WRITE_FAILED: 'CLIPBOARD_WRITE_FAILED',
  BATCH_IMPORT_PARSE_ERROR: 'BATCH_IMPORT_PARSE_ERROR',
  BATCH_IMPORT_PARTIAL: 'BATCH_IMPORT_PARTIAL',
  SRS_INVALID_RATING: 'SRS_INVALID_RATING',
  REVIEW_SESSION_EMPTY: 'REVIEW_SESSION_EMPTY',
  SRS_DISABLED: 'SRS_DISABLED',
} as const

export type AppErrorCode = typeof AppErrorCode[keyof typeof AppErrorCode]

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly details?: unknown
  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = details
  }
}
