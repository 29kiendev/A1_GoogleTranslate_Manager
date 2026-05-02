import { routeMessage } from './messageRouter'
import type { ExtensionMessage } from '../shared/types/message'
import type { AppSettings } from '../shared/types/settings'

chrome.runtime.onInstalled.addListener(() => {
  console.log('[TV] Translate Vault installed')
})

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    if (message.type === 'OPEN_DASHBOARD') {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') })
      sendResponse({ ok: true })
      return
    }
    if (message.type === 'OPEN_FAB_POPUP') {
      chrome.windows.create({
        url: chrome.runtime.getURL('popup.html') + '?source=fab',
        type: 'popup',
        width: 420,
        height: 560,
      })
      sendResponse({ ok: true })
      return
    }
    if (message.type === 'DETACH_FAB_POPUP') {
      chrome.windows.create({
        url: chrome.runtime.getURL('popup.html') + '?source=pinned',
        type: 'popup',
        width: 420,
        height: 560,
      })
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'FAB_HIDE_IFRAME' })
      }
      sendResponse({ ok: true })
      return
    }
    routeMessage(message)
      .then(sendResponse)
      .catch(err => sendResponse({ ok: false, error: { code: 'UNKNOWN_ERROR', message: String(err) } }))
    return true // keep channel open for async response
  }
)

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local' && changes['tv_settings']) {
    const oldSettings = changes['tv_settings'].oldValue as AppSettings | undefined
    const newSettings = changes['tv_settings'].newValue as AppSettings

    if (newSettings.fab.enabled && !oldSettings?.fab.enabled) {
      // Register for future tabs
      try {
        await chrome.scripting.registerContentScripts([{
          id: 'content-fab',
          js: ['content-fab.js'],
          matches: ['<all_urls>'],
          runAt: 'document_idle',
        }])
      } catch (err) {
        console.warn('[TV] Failed to register FAB content script:', err)
      }

      // Inject into all existing tabs
      const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] })
      for (const tab of tabs) {
        if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content-fab.js'],
          }).catch(() => {
            // Ignore errors for tabs where we don't have permission or are restricted
          })
        }
      }
    } else if (!newSettings.fab.enabled && oldSettings?.fab.enabled) {
      // Unregister
      try {
        await chrome.scripting.unregisterContentScripts({ ids: ['content-fab'] })
      } catch (err) {
        console.warn('[TV] Failed to unregister FAB content script:', err)
      }
    }
  }
})
