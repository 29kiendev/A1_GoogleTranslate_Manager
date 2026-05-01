// Google Translate DOM selectors — update this file if Google changes their markup

export const SELECTORS = {
  // Source text textarea (desktop)
  sourceTextarea: 'textarea[aria-label], textarea.er8Pae, [jsname="V679bc"] textarea',
  // Translation output container (desktop) — multiple fallbacks
  translatedOutput: [
    'span[jsname="W297wb"]',
    '.Q4iAWc',
    '[data-language][dir] span',
    '.translation span',
  ],
  // Source language button
  sourceLang: '[data-language-code]:first-of-type, [jsname="D8GKVb"] [data-language-code], .sl-sugg .j0muue',
  // Target language button
  targetLang: '[jsname="xi8kGd"] [data-language-code], [jsname="D8GKVb"] [data-language-code]:last-of-type, .tl-sugg .j0muue',
  // Mobile selectors (modern responsive GT)
  mobile: {
    sourceTextarea: 'textarea, #source, .textarea',
    translatedOutput: '.translation, #result_box, .result-container',
  },
  // Toolbar anchor: where we inject the floating toolbar
  toolbarAnchor: '.Q4iAWc, .lRu31, [data-language][dir], .result-container, .translation',
}

export function isMobilePage(): boolean {
  return window.location.pathname.startsWith('/m') || window.innerWidth < 720
}
