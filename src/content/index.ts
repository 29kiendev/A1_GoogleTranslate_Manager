import { startObserver } from './dom/observer'
import { extractTranslation } from './dom/extractor'
import { renderToolbar, removeToolbar } from './ui/injectToolbar'
import {
  setCurrentPayload,
  getCurrentPayload,
  setSavedCount,
  getSavedCount,
} from './state/contentState'
import type { ExtensionMessage } from '../shared/types/message'
import type { AppSettings } from '../shared/types/settings'
import type { Translation } from '../shared/types/translation'

function sendMessage<T>(message: ExtensionMessage): Promise<T> {
  return new Promise(resolve => chrome.runtime.sendMessage(message, resolve))
}

async function checkSavedStatus(payload: ReturnType<typeof extractTranslation>): Promise<void> {
  if (!payload) return
  const res = await sendMessage<{ ok: boolean; data?: { total: number } }>({
    type: 'SEARCH_TRANSLATIONS',
    payload: {
      q: payload.sourceText,
      sourceLang: payload.sourceLang,
      targetLang: payload.targetLang,
      limit: 1,
    },
  })
  if (res?.ok && res.data) {
    setSavedCount(res.data.total)
    renderToolbar(getCurrentPayload(), getSavedCount(), handleSave)
  }
}

async function handleSave(): Promise<void> {
  const payload = getCurrentPayload()
  if (!payload) return

  const res = await sendMessage<{ ok: boolean; data?: Translation }>({
    type: 'SAVE_TRANSLATION',
    payload: {
      sourceText: payload.sourceText,
      translatedText: payload.translatedText,
      sourceLang: payload.sourceLang,
      targetLang: payload.targetLang,
      capturedFromUrl: payload.sourceUrl,
      captureMode: captureMode === 'auto' ? 'auto' : 'manual',
      metadata: { sourceUrl: payload.sourceUrl },
    },
  })

  if (res?.ok && res.data) {
    setSavedCount(res.data.usageCount)
    renderToolbar(getCurrentPayload(), getSavedCount(), handleSave)
  }
}

let captureMode: AppSettings['captureMode'] = 'manual'

function onTranslationDetected(
  payload: NonNullable<ReturnType<typeof extractTranslation>>
): void {
  if (captureMode === 'off') {
    removeToolbar()
    return
  }
  setCurrentPayload(payload)
  renderToolbar(payload, null, handleSave)
  checkSavedStatus(payload)
  if (captureMode === 'auto') handleSave()
}

async function init(): Promise<void> {
  const settingsRes = await sendMessage<{ ok: boolean; data?: AppSettings }>({ type: 'GET_SETTINGS' })
  if (settingsRes?.ok && settingsRes.data) {
    captureMode = settingsRes.data.captureMode
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.altKey && e.shiftKey && e.key === 'S') handleSave()
  })

  const initial = extractTranslation()
  if (initial) onTranslationDetected(initial)

  startObserver(onTranslationDetected)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
