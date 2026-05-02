import { startObserver } from './dom/observer'
import { extractTranslation, checkSelectors } from './dom/extractor'
import { renderToolbar, removeToolbar, showToast, showConfirm } from './ui/injectToolbar'
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
    renderToolbar(getCurrentPayload(), getSavedCount(), handleSave, checkSelectors())
  }
}

async function performSave(): Promise<void> {
  const payload = getCurrentPayload()
  if (!payload) return

  const res = await sendMessage<{ ok: boolean; data?: Translation }>({
    type: 'SAVE_TRANSLATION',
    payload: {
      sourceText: payload.sourceText,
      translatedText: payload.translatedText,
      sourceLang: payload.sourceLang,
      targetLang: payload.targetLang,
      sourceLangLabel: payload.sourceLangLabel,
      targetLangLabel: payload.targetLangLabel,
      capturedFromUrl: payload.sourceUrl,
      captureMode: captureMode === 'auto' ? 'auto' : 'manual',
      metadata: { sourceUrl: payload.sourceUrl, context: payload.context ?? null },
    },
  })

  if (res?.ok && res.data) {
    setSavedCount(res.data.usageCount)
    renderToolbar(getCurrentPayload(), getSavedCount(), handleSave, checkSelectors())
    if (captureMode === 'auto' && res.data.usageCount > 1) {
      showToast(`Already saved ${res.data.usageCount}x`)
    }
  }
}

async function handleSave(): Promise<void> {
  const payload = getCurrentPayload()
  if (!payload) return

  if (requireConfirmation && captureMode !== 'auto') {
    showConfirm(
      () => performSave(),
      () => {} // Do nothing on Cancel
    )
  } else {
    await performSave()
  }
}

let captureMode: AppSettings['captureMode'] = 'manual'
let requireConfirmation = false
let showInjectedButtons = true

function onTranslationDetected(
  payload: NonNullable<ReturnType<typeof extractTranslation>>
): void {
  if (captureMode === 'off') {
    removeToolbar()
    return
  }
  setCurrentPayload(payload)
  renderToolbar(payload, null, handleSave, checkSelectors())
  checkSavedStatus(payload)
  if (captureMode === 'auto') handleSave()
}

async function init(): Promise<void> {
  const settingsRes = await sendMessage<{ ok: boolean; data?: AppSettings }>({ type: 'GET_SETTINGS' })
  if (settingsRes?.ok && settingsRes.data) {
    captureMode = settingsRes.data.captureMode
    requireConfirmation = settingsRes.data.privacyMode.requireConfirmationBeforeSaving
    showInjectedButtons = settingsRes.data.showInjectedButtons
    if (settingsRes.data.enableKeyboardShortcuts) {
      document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.altKey && e.shiftKey && e.key === 'S') handleSave()
      })
    }
  }

  if (!showInjectedButtons) return

  const isHealthy = checkSelectors()
  const initial = extractTranslation()
  if (initial || !isHealthy) {
    if (initial) onTranslationDetected(initial)
    else renderToolbar(null, null, handleSave, false)
  }

  startObserver(onTranslationDetected)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
