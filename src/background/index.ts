import { routeMessage } from './messageRouter'
import type { ExtensionMessage } from '../shared/types/message'

chrome.runtime.onInstalled.addListener(() => {
  console.log('[TV] Translate Vault installed')
})

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'OPEN_DASHBOARD') {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') })
      sendResponse({ ok: true })
      return
    }
    routeMessage(message)
      .then(sendResponse)
      .catch(err => sendResponse({ ok: false, error: { code: 'UNKNOWN_ERROR', message: String(err) } }))
    return true // keep channel open for async response
  }
)
