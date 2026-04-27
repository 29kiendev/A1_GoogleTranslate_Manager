import { getDB } from '../db'
import type {
  Translation,
  TranslationId,
  FolderId,
  SearchTranslationsQuery,
  SearchTranslationsResult,
  LangPairCount,
} from '../../types/translation'
import { startOfWeek } from '../../utils/date'
import { normalizeText } from '../../utils/normalizeText'

export async function getTranslationById(id: TranslationId): Promise<Translation | undefined> {
  const db = await getDB()
  return db.get('translations', id)
}

export async function getTranslationByDedupeKey(key: string): Promise<Translation | undefined> {
  const db = await getDB()
  return db.getFromIndex('translations', 'dedupeKey', key)
}

export async function upsertTranslation(t: Translation): Promise<void> {
  const db = await getDB()
  await db.put('translations', t)
}

export async function updateTranslation(
  id: TranslationId,
  patch: Partial<Translation>
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('translations', id)
  if (!existing) return
  await db.put('translations', { ...existing, ...patch, id, updatedAt: Date.now() })
}

export async function softDeleteTranslation(id: TranslationId): Promise<void> {
  await updateTranslation(id, { isDeleted: true })
}

export async function getRecentTranslations(limit: number): Promise<Translation[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('translations', 'lastUsedAt')
  return all
    .filter(t => !t.isDeleted)
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, limit)
}

export async function getDueReviews(limit: number): Promise<Translation[]> {
  const db = await getDB()
  const now = Date.now()
  const all = await db.getAll('translations')
  return all
    .filter(t => !t.isDeleted && t.srsEnabled && t.nextReviewAt !== null && t.nextReviewAt <= now)
    .sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0))
    .slice(0, limit)
}

export async function getDueReviewCount(): Promise<number> {
  const db = await getDB()
  const now = Date.now()
  const all = await db.getAll('translations')
  return all.filter(
    t => !t.isDeleted && t.srsEnabled && t.nextReviewAt !== null && t.nextReviewAt <= now
  ).length
}

export async function getDistinctLangPairs(): Promise<LangPairCount[]> {
  const db = await getDB()
  const all = await db.getAll('translations')
  const map = new Map<string, LangPairCount>()
  for (const t of all) {
    if (t.isDeleted || !t.sourceLang || !t.targetLang) continue
    const key = `${t.sourceLang}::${t.targetLang}`
    const existing = map.get(key)
    if (existing) {
      existing.count++
    } else {
      map.set(key, { sourceLang: t.sourceLang, targetLang: t.targetLang, count: 1 })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

export async function searchTranslations(
  query: SearchTranslationsQuery
): Promise<SearchTranslationsResult> {
  const db = await getDB()
  const {
    q,
    folderId,
    includeSubfolders,
    sourceLang,
    targetLang,
    isStarred,
    tagIds,
    createdFrom,
    createdTo,
    srsEnabled,
    dueForReview,
    neverReviewed,
    limit = 50,
    offset = 0,
    sortBy = 'createdAt',
    sortDirection = 'desc',
  } = query

  let items = await db.getAll('translations')
  const now = Date.now()

  items = items.filter(t => {
    if (t.isDeleted) return false
    if (isStarred !== undefined && t.isStarred !== isStarred) return false
    if (srsEnabled !== undefined && t.srsEnabled !== srsEnabled) return false
    if (dueForReview && !(t.srsEnabled && t.nextReviewAt !== null && t.nextReviewAt <= now)) return false
    if (neverReviewed && (t.lastReviewedAt !== null || t.srsEnabled)) return false
    if (sourceLang && t.sourceLang !== sourceLang) return false
    if (targetLang && t.targetLang !== targetLang) return false
    if (createdFrom && t.createdAt < createdFrom) return false
    if (createdTo && t.createdAt > createdTo) return false
    if (folderId !== undefined && !includeSubfolders && t.folderId !== folderId) return false
    if (q) {
      const needle = normalizeText(q)
      const haystack = [t.sourceText, t.translatedText, t.note ?? ''].map(normalizeText).join(' ')
      if (!haystack.includes(needle)) return false
    }
    return true
  })

  // Subfolder filter requires folder IDs — caller should pass folderIds via folderId query
  // (folderService resolves descendant IDs before calling search)

  if (tagIds && tagIds.length > 0) {
    const tagSet = new Set(tagIds)
    const txTags = await db.getAll('translation_tags')
    const translationIdsWithTags = new Set(
      txTags.filter(tt => tagSet.has(tt.tagId)).map(tt => tt.translationId)
    )
    items = items.filter(t => translationIdsWithTags.has(t.id))
  }

  items.sort((a, b) => {
    let av: number | string = 0
    let bv: number | string = 0
    if (sortBy === 'sourceText') {
      av = a.sourceText.toLowerCase()
      bv = b.sourceText.toLowerCase()
    } else if (sortBy === 'nextReviewAt') {
      av = a.nextReviewAt ?? Infinity
      bv = b.nextReviewAt ?? Infinity
    } else {
      av = a[sortBy] as number
      bv = b[sortBy] as number
    }
    if (av < bv) return sortDirection === 'asc' ? -1 : 1
    if (av > bv) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const total = items.length
  const paged = items.slice(offset, offset + limit)
  return { items: paged, total, limit, offset }
}

export async function getTranslationsByFolder(folderIds: FolderId[]): Promise<Translation[]> {
  const db = await getDB()
  const all = await db.getAll('translations')
  const set = new Set(folderIds)
  return all.filter(t => !t.isDeleted && t.folderId !== null && set.has(t.folderId))
}

export async function countByFolder(folderId: FolderId): Promise<number> {
  const db = await getDB()
  const all = await db.getAllFromIndex('translations', 'folderId', folderId)
  return all.filter(t => !t.isDeleted).length
}

// Used by startOfWeek smart collection
export { startOfWeek }
