import type { FolderId } from './folder'
import type { ProviderType } from './provider'

export interface AppSettings {
  schemaVersion: number
  captureMode: 'manual' | 'auto' | 'off'
  defaultFolderId: FolderId | null
  dedupePolicy: 'update_existing' | 'create_new' | 'ask'
  popupDefaultView: 'recent' | 'search' | 'folders' | 'translate'
  searchDebounceMs: number
  maxRecentItems: number
  showInjectedButtons: boolean
  enableKeyboardShortcuts: boolean
  srs: {
    enabled: boolean
    autoEnrollOnSave: boolean
    dailyReviewLimit: number
  }
  reviewStreak: {
    currentDays: number
    lastReviewDate: string | null
    longestDays: number
  }
  privacyMode: {
    requireConfirmationBeforeSaving: boolean
    maskPopupContent: boolean
  }
  provider: {
    type: ProviderType
    apiKey: string
    endpoint: string
  }
  fab: {
    enabled: boolean
    autoHide: boolean
    openMode: 'inline' | 'window'
    position: {
      side: 'right' | 'left'
      offsetX: number
      offsetY: number
    }
    globalPosition: boolean
  }
  uiPreferences: {
    translateFontScale: number
    recentLanguagePairs: Array<{ sourceLang: string; targetLang: string }>
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 1,
  captureMode: 'manual',
  defaultFolderId: null,
  dedupePolicy: 'update_existing',
  popupDefaultView: 'recent',
  searchDebounceMs: 300,
  maxRecentItems: 20,
  showInjectedButtons: true,
  enableKeyboardShortcuts: false,
  srs: {
    enabled: true,
    autoEnrollOnSave: false,
    dailyReviewLimit: 20,
  },
  reviewStreak: {
    currentDays: 0,
    lastReviewDate: null,
    longestDays: 0,
  },
  privacyMode: {
    requireConfirmationBeforeSaving: false,
    maskPopupContent: false,
  },
  provider: {
    type: 'google_translate_web',
    apiKey: '',
    endpoint: '',
  },
  fab: {
    enabled: false,
    autoHide: true,
    openMode: 'inline',
    position: {
      side: 'right',
      offsetX: 16,
      offsetY: 80,
    },
    globalPosition: true,
  },
  uiPreferences: {
    translateFontScale: 1.0,
    recentLanguagePairs: [],
  },
}
