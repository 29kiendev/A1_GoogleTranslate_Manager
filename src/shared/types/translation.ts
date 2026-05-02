export type TranslationId = string
export type FolderId = string     
export type TagId = string        

export interface Translation {    
  id: TranslationId
  sourceText: string
  translatedText: string
  sourceLang: string | null       
  targetLang: string | null       
  sourceLangLabel?: string | null
  targetLangLabel?: string | null
  provider: 'google_translate'
  folderId: FolderId | null
  isStarred: boolean
  isArchived: boolean
  isDeleted: boolean
  note: string | null
  usageCount: number
  sourceHash: string
  translationHash: string
  dedupeKey: string
  createdAt: number
  updatedAt: number
  lastUsedAt: number
  capturedFromUrl: string
  captureMode: 'auto' | 'manual' | 'import' | 'batch_import'
  srsEnabled: boolean
  srsInterval: number
  srsEaseFactor: number
  srsRepetitions: number
  nextReviewAt: number | null
  lastReviewedAt: number | null
  metadata?: {
    pageTitle?: string
    detectedSourceLang?: string | null
    rawSourceLang?: string | null
    rawTargetLang?: string | null
    sourceUrl?: string | null
    context?: string | null
  }
}

export interface SearchTranslationsQuery {
  q?: string
  folderId?: FolderId | null
  includeSubfolders?: boolean
  sourceLang?: string | null
  targetLang?: string | null
  isStarred?: boolean
  tagIds?: TagId[]
  createdFrom?: number | null
  createdTo?: number | null
  srsEnabled?: boolean
  dueForReview?: boolean
  neverReviewed?: boolean
  isDeleted?: boolean
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'lastUsedAt' | 'sourceText' | 'usageCount' | 'nextReviewAt'
  sortDirection?: 'asc' | 'desc'
}

export interface SearchTranslationsResult {
  items: Translation[]
  total: number
  limit: number
  offset: number
}

export interface LangPairCount {
  sourceLang: string
  targetLang: string
  count: number
}
