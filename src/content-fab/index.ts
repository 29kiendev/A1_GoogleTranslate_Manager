import type { AppSettings } from '../shared/types/settings'

;(function () {
  const SETTINGS_KEY = 'tv_settings'
  let settings: AppSettings | null = null
  let fabWrapper: HTMLDivElement | null = null
  let iframeEl: HTMLIFrameElement | null = null
  let backdropEl: HTMLDivElement | null = null
  let iframeVisible = false
  let hideTimeout: ReturnType<typeof setTimeout> | null = null
  let isDragging = false
  let dragStartX = 0, dragStartY = 0, dragStartLeft = 0, dragStartTop = 0
  let hasDragged = false

  // ── INIT ─────────────────────────────────────────────────────────────────
  async function init() {
    const res = await chrome.storage.local.get(SETTINGS_KEY)
    settings = res[SETTINGS_KEY] as AppSettings
    if (!settings?.fab.enabled) return
    createFAB()
  }

  // ── FAB BUTTON ───────────────────────────────────────────────────────────
  function createFAB() {
    if (fabWrapper || !settings) return
    fabWrapper = document.createElement('div')
    fabWrapper.id = 'tv-fab-wrapper'

    const side = settings.fab.position.side || 'right'
    const offsetX = settings.fab.position.offsetX ?? 16
    const offsetY = settings.fab.position.offsetY ?? 80  // percent from top

    // Restore saved position from storage (global or per-domain)
    const posKey = settings.fab.globalPosition !== false
      ? 'tv_fab_pos'
      : 'tv_fab_pos_' + location.hostname.replace(/[^a-z0-9]/gi, '_')

    Object.assign(fabWrapper.style, {
      position: 'fixed',
      zIndex: '2147483647',
      width: '52px',
      height: '52px',
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'opacity 0.3s ease',
      // Initial default position; overridden by saved pos below
      [side]: offsetX + 'px',
      top: offsetY + '%',
    })

    // Apply zoom correction
    function updateZoom() {
      if (!fabWrapper) return
      const zoom = window.outerWidth / window.innerWidth || 1
      fabWrapper.style.transform = 'scale(' + (1 / zoom) + ')'
      fabWrapper.style.transformOrigin = side === 'right' ? 'bottom right' : 'bottom left'
    }
    window.addEventListener('resize', updateZoom)
    updateZoom()

    // Load saved position
    chrome.storage.local.get(posKey, res => {
      if (!fabWrapper) return
      const pos = res[posKey] as { left?: string; top?: string; right?: string; bottom?: string } | undefined
      if (pos) {
        fabWrapper.style.left = pos.left || 'auto'
        fabWrapper.style.top = pos.top || 'auto'
        fabWrapper.style.right = pos.right || 'auto'
        fabWrapper.style.bottom = pos.bottom || 'auto'
      }
    })

    // FAB button visual (glass circle with "T")
    const fabBtn = document.createElement('div')
    Object.assign(fabBtn.style, {
      width: '52px',
      height: '52px',
      borderRadius: '50%',
      background: 'rgba(26, 115, 232, 0.88)',
      backdropFilter: 'blur(12px)',
      webkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.3)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '22px',
      fontWeight: 'bold',
      fontFamily: 'sans-serif',
      transition: 'transform 0.2s ease',
      userSelect: 'none',
    })
    fabBtn.innerText = 'T'
    fabWrapper.appendChild(fabBtn)

    // ── DRAGGING ─────────────────────────────────────────────────────────
    fabWrapper.addEventListener('mousedown', e => {
      if (!fabWrapper) return
      isDragging = true
      hasDragged = false
      dragStartX = e.clientX
      dragStartY = e.clientY
      const rect = fabWrapper.getBoundingClientRect()
      dragStartLeft = rect.left
      dragStartTop = rect.top
      e.preventDefault()
    })

    document.addEventListener('mousemove', e => {
      if (!isDragging || !fabWrapper) return
      const dx = e.clientX - dragStartX
      const dy = e.clientY - dragStartY
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasDragged = true
      if (!hasDragged) return

      const zoom = window.outerWidth / window.innerWidth || 1
      let newLeft = (dragStartLeft + dx) * zoom
      let newTop = (dragStartTop + dy) * zoom

      // Clamp to viewport
      const vw = window.innerWidth * zoom
      const vh = window.innerHeight * zoom
      newLeft = Math.max(0, Math.min(vw - 52, newLeft))
      newTop = Math.max(0, Math.min(vh - 52, newTop))

      fabWrapper.style.left = newLeft + 'px'
      fabWrapper.style.top = newTop + 'px'
      fabWrapper.style.right = 'auto'
      fabWrapper.style.bottom = 'auto'
    })

    document.addEventListener('mouseup', () => {
      if (!isDragging || !fabWrapper || !settings) return
      isDragging = false
      if (hasDragged) {
        // Save position
        const posKey = settings.fab.globalPosition !== false
          ? 'tv_fab_pos'
          : 'tv_fab_pos_' + location.hostname.replace(/[^a-z0-9]/gi, '_')
        const pos = {
          left: fabWrapper.style.left,
          top: fabWrapper.style.top,
          right: '',
          bottom: '',
        }
        chrome.storage.local.set({ [posKey]: pos })
      }
      // Reset after click event fires (click fires after mouseup — the delay
      // lets the click handler see hasDragged=true and skip the open action)
      setTimeout(() => { hasDragged = false }, 0)
    })

    // ── CLICK (only if not a drag) ────────────────────────────────────────
    fabWrapper.addEventListener('click', () => {
      if (hasDragged || !settings) return  // drag ended — not a click
      if (settings.fab.openMode === 'window') {
        chrome.runtime.sendMessage({ type: 'OPEN_FAB_POPUP' })
      } else {
        toggleIframe()
      }
    })

    // ── AUTO-HIDE ─────────────────────────────────────────────────────────
    if (settings.fab.autoHide) {
      startAutoHide()
      fabWrapper.addEventListener('mouseenter', () => { stopAutoHide(); if (fabWrapper) fabWrapper.style.opacity = '1' })
      fabWrapper.addEventListener('mouseleave', () => { startAutoHide() })
    }

    document.body.appendChild(fabWrapper)
  }

  function startAutoHide() {
    stopAutoHide()
    hideTimeout = setTimeout(() => { if (fabWrapper) fabWrapper.style.opacity = '0.3' }, 3000)
  }
  function stopAutoHide() {
    if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null }
  }

  // ── IFRAME OVERLAY ───────────────────────────────────────────────────────
  function toggleIframe() {
    if (iframeVisible) { hideIframe(); return }
    showIframe()
  }

  function showIframe() {
    if (!backdropEl) createIframeOverlay()
    if (backdropEl) backdropEl.style.display = 'block'
    if (iframeEl) iframeEl.style.display = 'block'
    iframeVisible = true
  }

  function hideIframe() {
    if (backdropEl) backdropEl.style.display = 'none'
    if (iframeEl) iframeEl.style.display = 'none'
    iframeVisible = false
  }

  function createIframeOverlay() {
    // Backdrop (click-outside to dismiss)
    backdropEl = document.createElement('div')
    Object.assign(backdropEl.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483645',
      background: 'transparent',
      display: 'none',
    })
    backdropEl.addEventListener('click', hideIframe)
    document.body.appendChild(backdropEl)

    // Iframe
    iframeEl = document.createElement('iframe')
    iframeEl.src = chrome.runtime.getURL('popup.html') + '?source=fab'
    Object.assign(iframeEl.style, {
      position: 'fixed',
      zIndex: '2147483646',
      width: '420px',
      height: '560px',
      border: 'none',
      borderRadius: '12px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.28)',
      display: 'none',
    })
    // Position iframe near FAB (bottom-right default, avoid screen edge)
    positionIframe()
    document.body.appendChild(iframeEl)
  }

  function positionIframe() {
    if (!iframeEl || !fabWrapper) return
    const fabRect = fabWrapper.getBoundingClientRect()
    const margin = 8
    const iw = 420, ih = 560

    // Try right of FAB, else left; try above FAB, else below
    let left = fabRect.right + margin
    if (left + iw > window.innerWidth) left = fabRect.left - iw - margin
    left = Math.max(margin, left)

    let top = fabRect.top
    if (top + ih > window.innerHeight) top = window.innerHeight - ih - margin
    top = Math.max(margin, top)

    iframeEl.style.left = left + 'px'
    iframeEl.style.top = top + 'px'
  }

  // ── MESSAGE LISTENER ─────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener(message => {
    if (message.type === 'FAB_HIDE_IFRAME') hideIframe()
  })

  // ── SETTINGS CHANGE ──────────────────────────────────────────────────────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[SETTINGS_KEY]) return
    settings = changes[SETTINGS_KEY].newValue as AppSettings
    if (!settings.fab.enabled) {
      if (fabWrapper) { fabWrapper.remove(); fabWrapper = null }
      hideIframe()
    } else if (!fabWrapper) {
      createFAB()
    } else {
        // Handle changes while enabled
        const side = settings.fab.position.side
        const offsetX = settings.fab.position.offsetX
        const offsetY = settings.fab.position.offsetY
        
        // Only update if not dragged
        if (!hasDragged) {
            fabWrapper.style.left = side === 'left' ? `${offsetX}px` : 'auto'
            fabWrapper.style.right = side === 'right' ? `${offsetX}px` : 'auto'
            fabWrapper.style.top = `${offsetY}%`
        }

        if (!settings.fab.autoHide) {
            stopAutoHide()
            fabWrapper.style.opacity = '1'
        } else {
            startAutoHide()
        }
    }
  })

  init()
})()
