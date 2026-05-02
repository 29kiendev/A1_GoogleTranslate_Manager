import type { IDBPDatabase } from 'idb'
import type { TranslateVaultDB } from './schema'

export function migrate(
  db: IDBPDatabase<TranslateVaultDB>,
  oldVersion: number,
  _newVersion: number
): void {
  if (oldVersion < 1) {
    const translations = db.createObjectStore('translations', { keyPath: 'id' })
    translations.createIndex('dedupeKey', 'dedupeKey', { unique: true })
    translations.createIndex('folderId', 'folderId')
    translations.createIndex('isDeleted', 'isDeleted')
    translations.createIndex('isStarred', 'isStarred')
    translations.createIndex('createdAt', 'createdAt')
    translations.createIndex('lastUsedAt', 'lastUsedAt')
    translations.createIndex('usageCount', 'usageCount')
    translations.createIndex('nextReviewAt', 'nextReviewAt')
    translations.createIndex('srsEnabled', 'srsEnabled')
    translations.createIndex('sourceLang', 'sourceLang')
    translations.createIndex('targetLang', 'targetLang')

    const folders = db.createObjectStore('folders', { keyPath: 'id' })
    folders.createIndex('parentId', 'parentId')
    folders.createIndex('isDeleted', 'isDeleted')

    const tags = db.createObjectStore('tags', { keyPath: 'id' })
    tags.createIndex('slug', 'slug', { unique: true })

    const translationTags = db.createObjectStore('translation_tags', { keyPath: 'id' })
    translationTags.createIndex('translationId', 'translationId')
    translationTags.createIndex('tagId', 'tagId')
    translationTags.createIndex('pair', ['translationId', 'tagId'], { unique: true })
  }

  if (oldVersion < 2) {
    if (!db.objectStoreNames.contains('phrasebooks')) {
      const phrasebooks = db.createObjectStore('phrasebooks', { keyPath: 'id' })
      phrasebooks.createIndex('isDeleted', 'isDeleted')
    }
    if (!db.objectStoreNames.contains('phrasebook_items')) {
      const items = db.createObjectStore('phrasebook_items', { keyPath: 'id' })
      items.createIndex('phrasebookId', 'phrasebookId')
      items.createIndex('translationId', 'translationId')
      items.createIndex('pair', ['phrasebookId', 'translationId'], { unique: true })
    }
  }
}
