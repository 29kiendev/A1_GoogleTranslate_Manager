import { nanoid } from 'nanoid'
import { sha256Hex } from '../utils/hash'
import { normalizeText } from '../utils/normalizeText'
import {
  getTranslationByDedupeKey,
  upsertTranslation,
  updateTranslation,
} from '../db/repositories/translationRepository'
import { getSettings } from '../db/repositories/settingsRepository'
import type { Translation } from '../types/translation'
import type { SaveTranslationPayload } from '../types/message'

export async function buildDedupeKey(
  sourceText: string,
  translatedText: string,
  sourceLang: string | null,
  targetLang: string | null
): Promise<string> {
  return sha256Hex(
    normalizeText(sourceText) +
    '::' +
    normalizeText(translatedText) +
    '::' +
    normalizeText(sourceLang ?? 'auto') +
    '::' +
    normalizeText(targetLang ?? 'unknown')
  )
}

export async function saveTranslation(payload: SaveTranslationPayload): Promise<Translation> {
  const settings = await getSettings()
  const now = Date.now()

  const dedupeKey = await buildDedupeKey(
    payload.sourceText,
    payload.translatedText,
    payload.sourceLang,
    payload.targetLang
  )

  const existing = await getTranslationByDedupeKey(dedupeKey)

  if (existing) {
    const policy = settings.dedupePolicy
    if (policy !== 'create_new') {
      const updates: Partial<Translation> = {
        usageCount: existing.usageCount + 1,
        lastUsedAt: now,
        updatedAt: now,
      }

      if (settings.srs.autoEnrollOnSave && !existing.srsEnabled) {
        Object.assign(updates, {
          srsEnabled: true,
          srsInterval: 1,
          srsEaseFactor: 2.5,
          srsRepetitions: 0,
          nextReviewAt: now + 86_400_000,
          lastReviewedAt: null,
        })
      }

      await updateTranslation(existing.id, updates)
      return { ...existing, ...updates } as Translation
    }
    // 'create_new' falls through to create
  }

  const sourceHash = await sha256Hex(normalizeText(payload.sourceText))
  const translationHash = await sha256Hex(normalizeText(payload.translatedText))

  const newTranslation: Translation = {
    id: nanoid(),
    sourceText: payload.sourceText,
    translatedText: payload.translatedText,
    sourceLang: payload.sourceLang,
    targetLang: payload.targetLang,
    sourceLangLabel: payload.sourceLangLabel ?? null,
    targetLangLabel: payload.targetLangLabel ?? null,
    provider: 'google_translate',
    folderId: settings.defaultFolderId,
    isStarred: false,
    isArchived: false,
    isDeleted: false,
    note: null,
    usageCount: 1,
    sourceHash,
    translationHash,
    dedupeKey,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
    capturedFromUrl: payload.capturedFromUrl,
    captureMode: payload.captureMode,
    srsEnabled: settings.srs.autoEnrollOnSave,
    srsInterval: 1,
    srsEaseFactor: 2.5,
    srsRepetitions: 0,
    nextReviewAt: settings.srs.autoEnrollOnSave ? now + 86_400_000 : null,
    lastReviewedAt: null,
    metadata: payload.metadata,
  }

  await upsertTranslation(newTranslation)
  return newTranslation
}
