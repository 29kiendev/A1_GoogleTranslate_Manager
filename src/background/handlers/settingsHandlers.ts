import { getSettings, updateSettings } from '../../shared/db/repositories/settingsRepository'
import type { ExtensionResponse } from '../../shared/types/message'
import type { AppSettings } from '../../shared/types/settings'

export async function handleGetSettings(): Promise<ExtensionResponse> {
  try {
    const settings = await getSettings()
    return { ok: true, data: settings }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleUpdateSettings(patch: Partial<AppSettings>): Promise<ExtensionResponse> {
  try {
    const updated = await updateSettings(patch)
    return { ok: true, data: updated }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}
