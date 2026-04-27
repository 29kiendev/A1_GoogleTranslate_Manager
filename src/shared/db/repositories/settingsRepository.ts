import type { AppSettings } from '../../types/settings'
import { DEFAULT_SETTINGS } from '../../types/settings'
import { SETTINGS_KEY } from '../../constants/app'

export async function getSettings(): Promise<AppSettings> {
  return new Promise(resolve => {
    chrome.storage.local.get(SETTINGS_KEY, result => {
      const stored = result[SETTINGS_KEY] as Partial<AppSettings> | undefined
      resolve({ ...DEFAULT_SETTINGS, ...stored })
    })
  })
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, resolve)
  })
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings()
  const updated: AppSettings = {
    ...current,
    ...patch,
    srs: { ...current.srs, ...(patch.srs ?? {}) },
    reviewStreak: { ...current.reviewStreak, ...(patch.reviewStreak ?? {}) },
    privacyMode: { ...current.privacyMode, ...(patch.privacyMode ?? {}) },
  }
  await saveSettings(updated)
  return updated
}
