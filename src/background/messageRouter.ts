import {
  handleSaveTranslation,
  handleGetTranslation,
  handleUpdateTranslation,
  handleDeleteTranslation,
  handleRestoreTranslation,
  handlePermanentDeleteTranslation,
  handleEmptyTrash,
  handleStarTranslation,
  handleSearchTranslations,
  handleGetRecentTranslations,
  handleMoveTranslation,
  handleGetDueCount,
  handleGetLangPairs,
  handleGetSmartCollectionCounts,
} from './handlers/translationHandlers'
import {
  handleCreateFolder,
  handleUpdateFolder,
  handleDeleteFolder,
  handleGetFolderTree,
  handleGetFolderCounts,
  handleMoveFolder,
} from './handlers/folderHandlers'
import {
  handleGetDueReviews,
  handleReviewTranslation,
  handleEnrollSRS,
  handleUnenrollSRS,
} from './handlers/reviewHandlers'
import {
  handleGetTags,
  handleGetTagsForTranslation,
  handleCreateTag,
  handleAddTagToTranslation,
  handleRemoveTagFromTranslation,
} from './handlers/tagHandlers'
import { handleBatchSaveTranslations } from './handlers/batchHandlers'
import { handleExportData, handleImportData } from './handlers/importExportHandlers'
import { handleGetSettings, handleUpdateSettings } from './handlers/settingsHandlers'
import { handleTranslateText, handleGetUsageHint } from './handlers/providerHandlers'
import type { ExtensionMessage, ExtensionResponse } from '../shared/types/message'

export async function routeMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  switch (message.type) {
    case 'SAVE_TRANSLATION':
      return handleSaveTranslation(message.payload as any)
    case 'BATCH_SAVE_TRANSLATIONS':
      return handleBatchSaveTranslations(message.payload as any)
    case 'GET_TRANSLATION':
      return handleGetTranslation(message.payload as string)
    case 'UPDATE_TRANSLATION':
      return handleUpdateTranslation(message.payload as any)
    case 'DELETE_TRANSLATION':
      return handleDeleteTranslation(message.payload as string)
    case 'RESTORE_TRANSLATION':
      return handleRestoreTranslation(message.payload as string)
    case 'PERMANENT_DELETE_TRANSLATION':
      return handlePermanentDeleteTranslation(message.payload as string)
    case 'EMPTY_TRASH':
      return handleEmptyTrash()
    case 'STAR_TRANSLATION':
      return handleStarTranslation(message.payload as string)
    case 'SEARCH_TRANSLATIONS':
      return handleSearchTranslations(message.payload as any)
    case 'GET_RECENT_TRANSLATIONS':
      return handleGetRecentTranslations()
    case 'MOVE_TRANSLATION':
      return handleMoveTranslation(message.payload as any)
    case 'GET_DUE_COUNT':
      return handleGetDueCount()
    case 'GET_LANG_PAIRS':
      return handleGetLangPairs()
    case 'GET_SMART_COLLECTION_COUNTS':
      return handleGetSmartCollectionCounts()

    case 'CREATE_FOLDER':
      return handleCreateFolder(message.payload as any)
    case 'UPDATE_FOLDER':
      return handleUpdateFolder((message.payload as any).id, (message.payload as any).name)
    case 'DELETE_FOLDER':
      return handleDeleteFolder((message.payload as any).id, (message.payload as any).mode)
    case 'MOVE_FOLDER':
      return handleMoveFolder((message.payload as any).id, (message.payload as any).newParentId)
    case 'GET_FOLDER_TREE':
      return handleGetFolderTree()
    case 'GET_FOLDER_COUNTS':
      return handleGetFolderCounts()

    case 'GET_DUE_REVIEWS':
      return handleGetDueReviews()
    case 'REVIEW_TRANSLATION':
      return handleReviewTranslation((message.payload as any).id, (message.payload as any).rating)
    case 'ENROLL_SRS':
      return handleEnrollSRS(message.payload as string)
    case 'UNENROLL_SRS':
      return handleUnenrollSRS(message.payload as string)

    case 'GET_TAGS':
      return handleGetTags()
    case 'GET_TAGS_FOR_TRANSLATION':
      return handleGetTagsForTranslation(message.payload as string)
    case 'CREATE_TAG':
      return handleCreateTag(message.payload as any)
    case 'ADD_TAG_TO_TRANSLATION':
      return handleAddTagToTranslation(message.payload as any)
    case 'REMOVE_TAG_FROM_TRANSLATION':
      return handleRemoveTagFromTranslation(message.payload as any)

    case 'EXPORT_DATA':
      return handleExportData(message.payload as any)
    case 'IMPORT_DATA':
      return handleImportData(message.payload as any)

    case 'GET_SETTINGS':
      return handleGetSettings()
    case 'UPDATE_SETTINGS':
      return handleUpdateSettings(message.payload as any)

    case 'TRANSLATE_TEXT':
      return handleTranslateText(message.payload as any)
    case 'GET_USAGE_HINT':
      return handleGetUsageHint(message.payload as any)

    default:
      return { ok: false, error: { code: 'VALIDATION_ERROR', message: `Unknown message type: ${message.type}` } }
  }
}
