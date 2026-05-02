import type { Translation, TranslationId, FolderId, SearchTranslationsQuery, SearchTranslationsResult } from './translation'
import type { Folder, CreateFolderInput, MoveFolderInput, DeleteFolderMode } from './folder'
import type { Tag, TagId } from './tag'
import type { AppSettings } from './settings'
import type { ReviewRating, ReviewSession } from './review'
import type { BatchImportInput, BatchImportResult } from './batchImport'
import type { TranslateVaultExport, ImportOptions } from './importExport'
import type { AppErrorCode } from './errors'

export type MessageType =
  | 'TRANSLATION_DETECTED'
  | 'SAVE_TRANSLATION'
  | 'BATCH_SAVE_TRANSLATIONS'
  | 'SEARCH_TRANSLATIONS'
  | 'GET_RECENT_TRANSLATIONS'
  | 'GET_TRANSLATION'
  | 'UPDATE_TRANSLATION'
  | 'DELETE_TRANSLATION'
  | 'RESTORE_TRANSLATION'
  | 'PERMANENT_DELETE_TRANSLATION'
  | 'EMPTY_TRASH'
  | 'STAR_TRANSLATION'
  | 'ENROLL_SRS'
  | 'UNENROLL_SRS'
  | 'CREATE_FOLDER'
  | 'UPDATE_FOLDER'
  | 'DELETE_FOLDER'
  | 'MOVE_TRANSLATION'
  | 'GET_FOLDER_TREE'
  | 'GET_DUE_REVIEWS'
  | 'REVIEW_TRANSLATION'
  | 'EXPORT_DATA'
  | 'IMPORT_DATA'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'GET_LANG_PAIRS'
  | 'GET_DUE_COUNT'
  | 'OPEN_DASHBOARD'
  | 'GET_TAGS'
  | 'GET_TAGS_FOR_TRANSLATION'
  | 'CREATE_TAG'
  | 'ADD_TAG_TO_TRANSLATION'
  | 'REMOVE_TAG_FROM_TRANSLATION'
  | 'GET_FOLDER_COUNTS'
  | 'TRANSLATE_TEXT'
  | 'MOVE_FOLDER'
  | 'GET_USAGE_HINT'
  | 'GET_SMART_COLLECTION_COUNTS'
  | 'OPEN_FAB_POPUP'
  | 'DETACH_FAB_POPUP'
  | 'FAB_HIDE_IFRAME'
  | 'TEST_PROVIDER'
  | 'CREATE_PHRASEBOOK'
  | 'GET_PHRASEBOOKS'
  | 'DELETE_PHRASEBOOK'
  | 'ADD_TO_PHRASEBOOK'
  | 'REMOVE_FROM_PHRASEBOOK'
  | 'GET_PHRASEBOOK_ITEMS'
  | 'REORDER_PHRASEBOOK_ITEM'

export interface ExtensionMessage<TPayload = unknown> {
  type: MessageType
  payload?: TPayload
  requestId?: string
}

export interface ExtensionResponse<TData = unknown> {
  ok: boolean
  data?: TData
  error?: {
    code: AppErrorCode
    message: string
    details?: unknown
  }
}

// Typed payload helpers
export interface SaveTranslationPayload {
  sourceText: string
  translatedText: string
  sourceLang: string | null
  targetLang: string | null
  sourceLangLabel?: string | null
  targetLangLabel?: string | null
  capturedFromUrl: string
  captureMode: Translation['captureMode']
  metadata?: Translation['metadata']
}

export interface UpdateTranslationPayload {
  id: TranslationId
  patch: Partial<Pick<Translation, 'folderId' | 'isStarred' | 'note' | 'srsEnabled'>>
}

export interface MoveTranslationPayload {
  id: TranslationId
  folderId: FolderId | null
}

export interface ReviewTranslationPayload {
  id: TranslationId
  rating: ReviewRating
}

export interface EnrollSrsPayload {
  id: TranslationId
}

export interface DeleteFolderPayload {
  id: FolderId
  mode: DeleteFolderMode
}

export interface ExportDataPayload {
  format: 'json' | 'anki_tsv' | 'markdown'
  query?: SearchTranslationsQuery
}

export interface ImportDataPayload {
  data: TranslateVaultExport
  options: ImportOptions
}

export interface TranslateTextPayload {
  text: string
  sourceLang: string
  targetLang: string
}

// Re-export for convenience
export type {
  Translation, TranslationId, FolderId, SearchTranslationsQuery, SearchTranslationsResult,
  Folder, CreateFolderInput, MoveFolderInput,
  Tag, TagId,
  AppSettings,
  ReviewRating, ReviewSession,
  BatchImportInput, BatchImportResult,
  TranslateVaultExport, ImportOptions,
}
