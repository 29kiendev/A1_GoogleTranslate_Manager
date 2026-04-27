import type { FolderId } from './folder'

export interface BatchImportInput {
  rows: Array<{
    sourceText: string
    translatedText: string
    note?: string
  }>
  sourceLang: string
  targetLang: string
  folderId: FolderId | null
  enrollSRS: boolean
  duplicateStrategy: 'skip' | 'update'
}

export interface BatchImportResult {
  total: number
  inserted: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ row: number; reason: string }>
}
