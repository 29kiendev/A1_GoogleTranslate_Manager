import type { ExtractedTranslation } from '../dom/extractor'
import { SELECTORS } from '../dom/selectors'

const TOOLBAR_ID = 'tv-toolbar-root'
const TOAST_ID = 'tv-toast-root'
let toastTimer: ReturnType<typeof setTimeout> | undefined

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
  onSave: () => void,
  isHealthy = true
): void {
  const result = getOrCreateShadowHost()
  if (!result) return
  const { shadow } = result

  const saveBtn = shadow.querySelector<HTMLButtonElement>('#tv-save')
  const statusEl = shadow.querySelector<HTMLSpanElement>('#tv-status')
  const toolbar = shadow.querySelector<HTMLDivElement>('#tv-toolbar')
  const warningEl = shadow.querySelector<HTMLSpanElement>('#tv-warning')
  const confirmGroup = shadow.querySelector<HTMLSpanElement>('#tv-confirm-group')

  if (!toolbar) return

  if (warningEl) {
    warningEl.style.display = isHealthy ? 'none' : 'inline'
  }

  if (!payload) {
    if (!isHealthy) {
      toolbar.style.display = 'flex'
      if (saveBtn) saveBtn.style.display = 'none'
      const otherBtns = shadow.querySelectorAll<HTMLButtonElement>('button:not(#tv-open)')
      otherBtns.forEach(b => { if (b.id !== 'tv-open') b.style.display = 'none' })
    } else {
      toolbar.style.display = 'none'
    }
    return
  }

  toolbar.style.display = 'flex'
  
  if (confirmGroup) confirmGroup.style.display = 'none'
  if (saveBtn) {
    saveBtn.style.display = 'inline-block'
    saveBtn.onclick = onSave
  }

  const copyBtns = shadow.querySelectorAll<HTMLButtonElement>('#tv-copy-o, #tv-copy-t')
  copyBtns.forEach(b => { (b as HTMLElement).style.display = 'inline-block' })

  if (statusEl) {
    if (savedCount === null) {
      statusEl.textContent = ''
    } else if (savedCount === 0) {
      statusEl.textContent = ''
    } else {
      statusEl.textContent = `Already saved (${savedCount}x)`
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

export function showConfirm(onYes: () => void, onNo: () => void): void {
  const result = getOrCreateShadowHost()
  if (!result) return
  const { shadow } = result

  const saveBtn = shadow.querySelector<HTMLButtonElement>('#tv-save')
  const confirmGroup = shadow.querySelector<HTMLSpanElement>('#tv-confirm-group')
  const confirmYes = shadow.querySelector<HTMLButtonElement>('#tv-confirm-yes')
  const confirmNo = shadow.querySelector<HTMLButtonElement>('#tv-confirm-no')

  if (saveBtn) saveBtn.style.display = 'none'
  if (confirmGroup) confirmGroup.style.display = 'inline-flex'

  if (confirmYes) confirmYes.onclick = () => {
    if (confirmGroup) confirmGroup.style.display = 'none'
    if (saveBtn) saveBtn.style.display = 'inline-block'
    onYes()
  }
  if (confirmNo) confirmNo.onclick = () => {
    if (confirmGroup) confirmGroup.style.display = 'none'
    if (saveBtn) saveBtn.style.display = 'inline-block'
    onNo()
  }
}

export function removeToolbar(): void {
  document.getElementById(TOOLBAR_ID)?.remove()
}

export function showToast(message: string): void {
  let host = document.getElementById(TOAST_ID)
  let shadow: ShadowRoot
  if (!host) {
    host = document.createElement('div')
    host.id = TOAST_ID
    document.body.appendChild(host)
    shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = TOAST_HTML
  } else {
    shadow = host.shadowRoot!
  }
  const toastEl = shadow.querySelector<HTMLDivElement>('#tv-toast')!
  const msgEl = shadow.querySelector<HTMLSpanElement>('#tv-toast-msg')!
  const dismissBtn = shadow.querySelector<HTMLButtonElement>('#tv-dismiss')!

  msgEl.textContent = message
  toastEl.classList.add('visible')

  const hide = () => { toastEl.classList.remove('visible'); clearTimeout(toastTimer) }
  dismissBtn.onclick = hide
  clearTimeout(toastTimer)
  toastTimer = setTimeout(hide, 4000)
}

const TOAST_HTML = `
<style>
  #tv-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #323232;
    color: #fff;
    font-size: 13px;
    font-family: 'Google Sans', Roboto, sans-serif;
    padding: 10px 16px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,.3);
    z-index: 2147483647;
    opacity: 0;
    transition: opacity .2s;
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: none;
  }
  #tv-toast.visible { opacity: 1; pointer-events: auto; }
  #tv-dismiss { background: none; border: none; color: #8ab4f8; cursor: pointer; font-size: 12px; padding: 0; }
</style>
<div id="tv-toast">
  <span id="tv-toast-msg"></span>
  <button id="tv-dismiss">Dismiss</button>
</div>`

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
  #tv-warning {
    background: #fef3cd;
    color: #b06000;
    border: 1px solid #fde68a;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
  }
  #tv-confirm-group { display: none; align-items: center; gap: 4px; }
  #tv-confirm-group span { font-weight: 500; margin-right: 4px; }
  #tv-confirm-yes { background: #188038; color: #fff; border-color: #188038; }
  #tv-confirm-yes:hover { background: #137333; }
</style>
<div id="tv-toolbar" style="display:none">
  <span id="tv-warning" style="display:none">Selectors outdated — Update extension</span>
  <button id="tv-save">Save</button>
  <span id="tv-confirm-group">
    <span>Save?</span>
    <button id="tv-confirm-yes">Yes</button>
    <button id="tv-confirm-no">No</button>
  </span>
  <button id="tv-copy-o">Copy Original</button>
  <button id="tv-copy-t">Copy Translation</button>
  <button id="tv-open">Open Vault</button>
  <span id="tv-status"></span>
</div>
`
