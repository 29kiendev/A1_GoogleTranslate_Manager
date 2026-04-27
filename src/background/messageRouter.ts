import {
  handleSaveTranslation,
  handleGetTranslation,
  handleUpdateTranslation,
  handleDeleteTranslation,
  handleStarTranslation,
  handleSearchTranslations,
  handleGetRecentTranslations,
  handleMoveTranslation,
  handleGetDueCount,
  handleGetLangPairs,
} from './handlers/translationHandlers'
import {
  handleGetFolderTree,
  handleCreateFolder,
  handleUpdateFolder,
  handleDeleteFolder,
  handleMoveFolder,
  handleGetFolderCounts,
} from './handlers/folderHandlers'
import {
  handleGetDueReviews,
  handleReviewTranslation,
  handleEnrollSRS,
  handleUnenrollSRS,
} from './handlers/reviewHandlers'
import { handleBatchSave } from './handlers/batchHandlers'
import {
  handleGetTags,
  handleGetTagsForTranslation,
  handleCreateTag,
  handleAddTagToTranslation,
  handleRemoveTagFromTranslation,
} from './handlers/tagHandlers'
import {
  handleExportJSON,
  handleExportAnkiTsv,
  handleExportMarkdown,
  handleImportJSON,
} from './handlers/importExportHandlers'
import { getSettings, updateSettings } from '../shared/db/repositories/settingsRepository'
import type { ExtensionMessage, ExtensionResponse } from '../shared/types/message'

export async function routeMessage(
  message: ExtensionMessage
): Promise<ExtensionResponse> {
  const { type, payload } = message

  switch (type) {
    case 'SAVE_TRANSLATION':
      return handleSaveTranslation(payload as never)
    case 'BATCH_SAVE_TRANSLATIONS':
      return handleBatchSave(payload as never)
    case 'GET_TRANSLATION':
      return handleGetTranslation(payload as string)
    case 'UPDATE_TRANSLATION':
      return handleUpdateTranslation(payload as never)
    case 'DELETE_TRANSLATION':
      return handleDeleteTranslation(payload as string)
    case 'STAR_TRANSLATION':
      return handleStarTranslation(payload as string)
    case 'SEARCH_TRANSLATIONS':
      return handleSearchTranslations(payload as never)
    case 'GET_RECENT_TRANSLATIONS':
      return handleGetRecentTranslations()
    case 'MOVE_TRANSLATION':
      return handleMoveTranslation(payload as never)
    case 'GET_DUE_COUNT':
      return handleGetDueCount()
    case 'GET_LANG_PAIRS':
      return handleGetLangPairs()
    case 'GET_FOLDER_TREE':
      return handleGetFolderTree()
    case 'CREATE_FOLDER':
      return handleCreateFolder(payload as never)
    case 'UPDATE_FOLDER': {
      const p = payload as { id: string; name: string }
      return handleUpdateFolder(p.id, p.name)
    }
    case 'DELETE_FOLDER': {
      const p = payload as { id: string; mode: never }
      return handleDeleteFolder(p.id, p.mode)
    }
    case 'GET_DUE_REVIEWS':
      return handleGetDueReviews()
    case 'REVIEW_TRANSLATION': {
      const p = payload as { id: string; rating: never }
      return handleReviewTranslation(p.id, p.rating)
    }
    case 'ENROLL_SRS':
      return handleEnrollSRS(payload as string)
    case 'UNENROLL_SRS':
      return handleUnenrollSRS(payload as string)
    case 'EXPORT_DATA': {
      const p = payload as { format: string; query?: never }
      if (p.format === 'anki_tsv') return handleExportAnkiTsv(p.query)
      if (p.format === 'markdown') return handleExportMarkdown(p.query)
      return handleExportJSON(p.query)
    }
    case 'IMPORT_DATA': {
      const p = payload as { data: never; options: never }
      return handleImportJSON(p.data, p.options)
    }
    case 'GET_SETTINGS':
      try {
        const s = await getSettings()
        return { ok: true, data: s }
      } catch (e) {
        return { ok: false, error: { code: 'UNKNOWN_ERROR', message: String(e) } }
      }
    case 'UPDATE_SETTINGS':
      try {
        const updated = await updateSettings(payload as never)
        return { ok: true, data: updated }
      } catch (e) {
        return { ok: false, error: { code: 'UNKNOWN_ERROR', message: String(e) } }
      }
    case 'GET_TAGS':
      return handleGetTags()
    case 'GET_TAGS_FOR_TRANSLATION':
      return handleGetTagsForTranslation(payload as string)
    case 'CREATE_TAG':
      return handleCreateTag(payload as { name: string; color?: string })
    case 'ADD_TAG_TO_TRANSLATION':
      return handleAddTagToTranslation(payload as { translationId: string; tagId: string })
    case 'REMOVE_TAG_FROM_TRANSLATION':
      return handleRemoveTagFromTranslation(payload as { translationId: string; tagId: string })
    case 'GET_FOLDER_COUNTS':
      return handleGetFolderCounts()
    case 'TRANSLATION_DETECTED':
      return { ok: true }
    default:
      return { ok: false, error: { code: 'UNKNOWN_ERROR', message: `Unknown message type: ${type as string}` } }
  }
}
