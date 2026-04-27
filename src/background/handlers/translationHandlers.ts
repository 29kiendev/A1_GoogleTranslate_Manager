import { saveTranslation } from '../../shared/services/dedupeService'
import {
  getTranslationById,
  updateTranslation,
  softDeleteTranslation,
  searchTranslations,
  getRecentTranslations,
  getDueReviewCount,
  getDistinctLangPairs,
} from '../../shared/db/repositories/translationRepository'
import { getSettings } from '../../shared/db/repositories/settingsRepository'
import type { ExtensionResponse } from '../../shared/types/message'
import type {
  SaveTranslationPayload,
  UpdateTranslationPayload,
  MoveTranslationPayload,
} from '../../shared/types/message'
import type { SearchTranslationsQuery } from '../../shared/types/translation'

export async function handleSaveTranslation(
  payload: SaveTranslationPayload
): Promise<ExtensionResponse> {
  try {
    const translation = await saveTranslation(payload)
    return { ok: true, data: translation }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleGetTranslation(id: string): Promise<ExtensionResponse> {
  try {
    const t = await getTranslationById(id)
    if (!t) return { ok: false, error: { code: 'NOT_FOUND', message: 'Translation not found' } }
    return { ok: true, data: t }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleUpdateTranslation(
  payload: UpdateTranslationPayload
): Promise<ExtensionResponse> {
  try {
    await updateTranslation(payload.id, payload.patch)
    const updated = await getTranslationById(payload.id)
    return { ok: true, data: updated }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleDeleteTranslation(id: string): Promise<ExtensionResponse> {
  try {
    await softDeleteTranslation(id)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleStarTranslation(id: string): Promise<ExtensionResponse> {
  try {
    const t = await getTranslationById(id)
    if (!t) return { ok: false, error: { code: 'NOT_FOUND', message: 'Translation not found' } }
    await updateTranslation(id, { isStarred: !t.isStarred })
    return { ok: true, data: { isStarred: !t.isStarred } }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleSearchTranslations(
  query: SearchTranslationsQuery
): Promise<ExtensionResponse> {
  try {
    const result = await searchTranslations(query)
    return { ok: true, data: result }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleGetRecentTranslations(): Promise<ExtensionResponse> {
  try {
    const settings = await getSettings()
    const items = await getRecentTranslations(settings.maxRecentItems)
    return { ok: true, data: items }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleMoveTranslation(
  payload: MoveTranslationPayload
): Promise<ExtensionResponse> {
  try {
    await updateTranslation(payload.id, { folderId: payload.folderId })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleGetDueCount(): Promise<ExtensionResponse> {
  try {
    const count = await getDueReviewCount()
    return { ok: true, data: count }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleGetLangPairs(): Promise<ExtensionResponse> {
  try {
    const pairs = await getDistinctLangPairs()
    return { ok: true, data: pairs }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}
