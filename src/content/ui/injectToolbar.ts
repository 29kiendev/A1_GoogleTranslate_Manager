import type { ExtractedTranslation } from '../dom/extractor'
import { SELECTORS } from '../dom/selectors'

const TOOLBAR_ID = 'tv-toolbar-root'

function getOrCreateShadowHost(): { host: HTMLElement; shadow: ShadowRoot } | null {
  let host = document.getElementById(TOOLBAR_ID)
  if (host) return { host, shadow: host.shadowRoot! }

  const anchor = document.querySelector<HTMLElement>(SELECTORS.toolbarAnchor)
  if (!anchor) return null

  host = document.createElement('div')
  host.id = TOOLBAR_ID
  host.style.cssText = 'display:inline-block;margin-top:8px;'

  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = TOOLBAR_HTML

  anchor.parentElement?.insertBefore(host, anchor.nextSibling)
  return { host, shadow }
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  })
}

export function renderToolbar(
  payload: ExtractedTranslation | null,
  savedCount: number | null,
  onSave: () => void
): void {
  const result = getOrCreateShadowHost()
  if (!result) return
  const { shadow } = result

  const saveBtn = shadow.querySelector<HTMLButtonElement>('#tv-save')
  const statusEl = shadow.querySelector<HTMLSpanElement>('#tv-status')
  const toolbar = shadow.querySelector<HTMLDivElement>('#tv-toolbar')

  if (!toolbar) return

  if (!payload) {
    toolbar.style.display = 'none'
    return
  }

  toolbar.style.display = 'flex'

  if (saveBtn) {
    saveBtn.onclick = onSave
  }

  if (statusEl) {
    if (savedCount === null) {
      statusEl.textContent = ''
    } else if (savedCount === 0) {
      statusEl.textContent = ''
    } else {
      statusEl.textContent = `Already saved (${savedCount}×)`
    }
  }

  const copyOBtn = shadow.querySelector<HTMLButtonElement>('#tv-copy-o')
  const copyTBtn = shadow.querySelector<HTMLButtonElement>('#tv-copy-t')
  const openBtn = shadow.querySelector<HTMLButtonElement>('#tv-open')

  if (copyOBtn) copyOBtn.onclick = () => copyToClipboard(payload.sourceText)
  if (copyTBtn) copyTBtn.onclick = () => copyToClipboard(payload.translatedText)
  if (openBtn) {
    openBtn.onclick = () => chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' })
  }
}

export function removeToolbar(): void {
  document.getElementById(TOOLBAR_ID)?.remove()
}

const TOOLBAR_HTML = `
<style>
  #tv-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    padding: 6px 8px;
    background: #fff;
    border: 1px solid #dadce0;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,.12);
    font-family: 'Google Sans', Roboto, sans-serif;
    font-size: 12px;
    z-index: 9999;
  }
  button {
    cursor: pointer;
    padding: 4px 10px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    background: #f8f9fa;
    color: #202124;
    font-size: 12px;
    white-space: nowrap;
  }
  button:hover { background: #e8f0fe; border-color: #4285f4; color: #1a73e8; }
  #tv-save { background: #1a73e8; color: #fff; border-color: #1a73e8; font-weight: 500; }
  #tv-save:hover { background: #1558b0; }
  #tv-status { font-size: 11px; color: #5f6368; }
</style>
<div id="tv-toolbar" style="display:none">
  <button id="tv-save">Save</button>
  <button id="tv-copy-o">Copy Original</button>
  <button id="tv-copy-t">Copy Translation</button>
  <button id="tv-open">Open Vault</button>
  <span id="tv-status"></span>
</div>
`
