import { getDB } from '../../shared/db/db'
import { getSettings } from '../../shared/db/repositories/settingsRepository'
import type { ExtensionResponse } from '../../shared/types/message'
import type { TranslateVaultExport, ImportOptions } from '../../shared/types/importExport'
import type { SearchTranslationsQuery } from '../../shared/types/translation'
import { searchTranslations } from '../../shared/db/repositories/translationRepository'
import { getAllFolders } from '../../shared/db/repositories/folderRepository'
import { getAllTags } from '../../shared/db/repositories/tagRepository'
import { SCHEMA_VERSION } from '../../shared/constants/app'
import { nanoid } from 'nanoid'
import { buildDedupeKey } from '../../shared/services/dedupeService'
import { upsertTranslation, getTranslationByDedupeKey, updateTranslation } from '../../shared/db/repositories/translationRepository'
import type { Translation } from '../../shared/types/translation'

export async function handleExportJSON(
  query?: SearchTranslationsQuery
): Promise<ExtensionResponse> {
  try {
    const db = await getDB()
    const translationsResult = query
      ? await searchTranslations({ ...query, limit: 100_000 })
      : await searchTranslations({ limit: 100_000 })
    const folders = await getAllFolders()
    const tags = await getAllTags()
    const translationTags = await db.getAll('translation_tags')
    const settings = await getSettings()

    const payload: TranslateVaultExport = {
      app: 'translate-vault',
      version: '0.1.0',
      exportedAt: Date.now(),
      schemaVersion: SCHEMA_VERSION,
      folders,
      translations: translationsResult.items,
      tags,
      translationTags,
      settings,
    }
    return { ok: true, data: payload }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleExportAnkiTsv(
  query?: SearchTranslationsQuery
): Promise<ExtensionResponse> {
  try {
    const result = await searchTranslations({ ...(query ?? {}), limit: 100_000 })
    const lines = result.items.map(t => {
      const langTag = `${t.sourceLang ?? 'auto'}→${t.targetLang ?? '?'}`
      return [t.sourceText, t.translatedText, langTag]
        .map(c => c.replace(/\t/g, ' ').replace(/\n/g, ' '))
        .join('\t')
    })
    return { ok: true, data: lines.join('\n') }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleExportMarkdown(
  query?: SearchTranslationsQuery
): Promise<ExtensionResponse> {
  try {
    const result = await searchTranslations({ ...(query ?? {}), limit: 100_000 })
    const header = '| Source | Translation | Lang |\n|--------|-------------|------|'
    const rows = result.items.map(t => {
      const lang = `${t.sourceLang ?? '?'} → ${t.targetLang ?? '?'}`
      return `| ${t.sourceText} | ${t.translatedText} | ${lang} |`
    })
    return { ok: true, data: [header, ...rows].join('\n') }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleImportJSON(
  data: TranslateVaultExport,
  options: ImportOptions
): Promise<ExtensionResponse> {
  try {
    if (data.app !== 'translate-vault') {
      return { ok: false, error: { code: 'IMPORT_INVALID_FILE', message: 'Not a Translate Vault export file' } }
    }
    if (data.schemaVersion > SCHEMA_VERSION) {
      return { ok: false, error: { code: 'IMPORT_SCHEMA_UNSUPPORTED', message: `Schema version ${data.schemaVersion} not supported` } }
    }

    const db = await getDB()

    if (options.mergeStrategy === 'replace') {
      const tx = db.transaction(['translations', 'folders', 'tags', 'translation_tags'], 'readwrite')
      await tx.objectStore('translations').clear()
      await tx.objectStore('folders').clear()
      await tx.objectStore('tags').clear()
      await tx.objectStore('translation_tags').clear()
      await tx.done
    }

    let inserted = 0, updated = 0, skipped = 0

    for (const folder of data.folders) {
      await db.put('folders', folder)
    }
    for (const tag of data.tags) {
      await db.put('tags', tag)
    }
    for (const tt of data.translationTags) {
      await db.put('translation_tags', tt)
    }

    for (const t of data.translations) {
      const existing = await getTranslationByDedupeKey(t.dedupeKey)
      if (existing) {
        if (options.duplicateStrategy === 'skip') { skipped++; continue }
        if (options.duplicateStrategy === 'update') {
          await updateTranslation(existing.id, { ...t, id: existing.id })
          updated++
        } else {
          const newT: Translation = { ...t, id: nanoid(), dedupeKey: await buildDedupeKey(t.sourceText, t.translatedText, t.sourceLang, t.targetLang) }
          await upsertTranslation(newT)
          inserted++
        }
      } else {
        await upsertTranslation(t)
        inserted++
      }
    }

    return { ok: true, data: { inserted, updated, skipped } }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}
