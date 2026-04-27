export type AppErrorCode =
  | 'UNKNOWN_ERROR'
  | 'DB_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DUPLICATE_FOLDER'
  | 'INVALID_FOLDER_MOVE'
  | 'IMPORT_INVALID_FILE'
  | 'IMPORT_SCHEMA_UNSUPPORTED'
  | 'CAPTURE_EMPTY_TRANSLATION'
  | 'CAPTURE_DOM_CHANGED'
  | 'CLIPBOARD_WRITE_FAILED'
  | 'BATCH_IMPORT_PARSE_ERROR'
  | 'BATCH_IMPORT_PARTIAL'
  | 'SRS_INVALID_RATING'
  | 'REVIEW_SESSION_EMPTY'

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}
