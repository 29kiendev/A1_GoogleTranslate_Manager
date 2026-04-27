// Google Translate DOM selectors — update this file if Google changes their markup

export const SELECTORS = {
  // Source text textarea (desktop)
  sourceTextarea: 'textarea[aria-label]',
  // Translation output container (desktop) — multiple fallbacks
  translatedOutput: [
    'span[jsname="W297wb"]',
    '.Q4iAWc',
    '[data-language][dir] span',
  ],
  // Source language button
  sourceLang: '[data-language-code]:first-of-type, [jsname="D8GKVb"] [data-language-code]',
  // Target language button
  targetLang: '[jsname="xi8kGd"] [data-language-code], [jsname="D8GKVb"] [data-language-code]:last-of-type',
  // Mobile (/m/) selectors
  mobile: {
    sourceTextarea: '#source',
    translatedOutput: '#result_box',
  },
  // Toolbar anchor: where we inject the floating toolbar
  toolbarAnchor: '.Q4iAWc, .lRu31, [data-language][dir]',
}

export function isMobilePage(): boolean {
  return window.location.pathname.startsWith('/m')
}
