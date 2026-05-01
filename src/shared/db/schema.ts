import type { DBSchema } from 'idb'
import type { Translation } from '../types/translation'
import type { Folder } from '../types/folder'
import type { Tag, TranslationTag } from '../types/tag'

export interface TranslateVaultDB extends DBSchema {
  translations: {
    key: string
    value: Translation
    indexes: {
      dedupeKey: string
      folderId: string
      isDeleted: number
      isStarred: number
      createdAt: number
      lastUsedAt: number
      usageCount: number
      nextReviewAt: number
      srsEnabled: number
      sourceLang: string
      targetLang: string
    }
  }
  folders: {
    key: string
    value: Folder
    indexes: {
      parentId: string
      isDeleted: number
    }
  }
  tags: {
    key: string
    value: Tag
    indexes: {
      slug: string
    }
  }
  translation_tags: {
    key: string
    value: TranslationTag
    indexes: {
      translationId: string
      tagId: string
      pair: [string, string]
    }
  }
}
