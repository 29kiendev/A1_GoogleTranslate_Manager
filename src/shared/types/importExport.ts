import type { Translation } from './translation'
import type { Folder } from './folder'
import type { Tag, TranslationTag } from './tag'
import type { AppSettings } from './settings'

export interface TranslateVaultExport {
  app: 'translate-vault'
  version: string
  exportedAt: number
  schemaVersion: number
  folders: Folder[]
  translations: Translation[]
  tags: Tag[]
  translationTags: TranslationTag[]
  settings?: Partial<AppSettings>
}

export interface ImportOptions {
  mergeStrategy: 'merge' | 'replace'
  duplicateStrategy: 'skip' | 'update' | 'create_new'
}
