import { nanoid } from 'nanoid'
import { buildDedupeKey } from '../../shared/services/dedupeService'
import {
  getTranslationByDedupeKey,
  upsertTranslation,
  updateTranslation,
} from '../../shared/db/repositories/translationRepository'
import type { ExtensionResponse } from '../../shared/types/message'
import type { BatchImportInput, BatchImportResult } from '../../shared/types/batchImport'
import type { Translation } from '../../shared/types/translation'
import { sha256Hex } from '../../shared/utils/hash'
import { normalizeText } from '../../shared/utils/normalizeText'

export async function handleBatchSave(input: BatchImportInput): Promise<ExtensionResponse> {
  const result: BatchImportResult = {
    total: input.rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  for (let i = 0; i < input.rows.length; i++) {
    const row = input.rows[i]
    try {
      const dedupeKey = await buildDedupeKey(
        row.sourceText,
        row.translatedText,
        input.sourceLang,
        input.targetLang
      )
      const existing = await getTranslationByDedupeKey(dedupeKey)
      const now = Date.now()

      if (existing) {
        if (input.duplicateStrategy === 'skip') {
          result.skipped++
          continue
        }
        await updateTranslation(existing.id, {
          usageCount: existing.usageCount + 1,
          lastUsedAt: now,
          updatedAt: now,
          note: row.note ?? existing.note,
        })
        result.updated++
        continue
      }

      const t: Translation = {
        id: nanoid(),
        sourceText: row.sourceText,
        translatedText: row.translatedText,
        sourceLang: input.sourceLang,
        targetLang: input.targetLang,
        sourceLangLabel: null,
        targetLangLabel: null,
        provider: 'google_translate',
        folderId: input.folderId,
        isStarred: false,
        isArchived: false,
        isDeleted: false,
        note: row.note ?? null,
        usageCount: 1,
        sourceHash: await sha256Hex(normalizeText(row.sourceText)),
        translationHash: await sha256Hex(normalizeText(row.translatedText)),
        dedupeKey,
        createdAt: now,
        updatedAt: now,
        lastUsedAt: now,
        capturedFromUrl: '',
        captureMode: 'batch_import',
        srsEnabled: input.enrollSRS,
        srsInterval: 1,
        srsEaseFactor: 2.5,
        srsRepetitions: 0,
        nextReviewAt: input.enrollSRS ? now + 86_400_000 : null,
        lastReviewedAt: null,
      }
      await upsertTranslation(t)
      result.inserted++
    } catch (e) {
      result.failed++
      result.errors.push({ row: i + 1, reason: String(e) })
    }
  }

  return { ok: true, data: result }
}
