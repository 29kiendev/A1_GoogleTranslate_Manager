import type { FolderId } from './folder'

export interface AppSettings {
  schemaVersion: number
  captureMode: 'manual' | 'auto' | 'off'
  defaultFolderId: FolderId | null
  dedupePolicy: 'update_existing' | 'create_new' | 'ask'
  popupDefaultView: 'recent' | 'search' | 'folders'
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
}
