import { SELECTORS, isMobilePage } from './selectors'

export interface ExtractedTranslation {
  sourceText: string
  translatedText: string
  sourceLang: string | null
  targetLang: string | null
  sourceLangLabel?: string | null
  targetLangLabel?: string | null
  sourceUrl: string
}

export function checkSelectors(): boolean {
  const mobile = isMobilePage()
  if (mobile) {
    return !!document.querySelector(SELECTORS.mobile.sourceTextarea) &&
           !!document.querySelector(SELECTORS.mobile.translatedOutput)
  }
  return !!document.querySelector(SELECTORS.sourceTextarea) &&
         !!SELECTORS.translatedOutput.find(sel => document.querySelector(sel))
}

function readSourceTextDesktop(): string {
  const el = document.querySelector<HTMLTextAreaElement>(SELECTORS.sourceTextarea)
  return el?.value.trim() ?? ''
}

function readTranslatedTextDesktop(): string {
  for (const sel of SELECTORS.translatedOutput) {
    const el = document.querySelector<HTMLElement>(sel)
    const text = el?.innerText.trim() ?? ''
    if (text) return text
  }
  return ''
}

function readSourceTextMobile(): string {
  const el = document.querySelector<HTMLTextAreaElement>(SELECTORS.mobile.sourceTextarea)
  return el?.value.trim() ?? ''
}

function readTranslatedTextMobile(): string {
  const el = document.querySelector<HTMLElement>(SELECTORS.mobile.translatedOutput)
  return el?.innerText.trim() ?? ''
}

function readLangsFromUrl(): { sourceLang: string | null; targetLang: string | null } {
  const url = new URL(window.location.href)
  const sl = url.searchParams.get('sl')
  const tl = url.searchParams.get('tl')
  return {
    sourceLang: sl && sl !== 'auto' ? sl : null,
    targetLang: tl ?? null,
  }
}

function readLangLabels(): { sourceLangLabel: string | null; targetLangLabel: string | null } {
  const sourceEl = document.querySelector<HTMLElement>(SELECTORS.sourceLang)
  const targetEl = document.querySelector<HTMLElement>(SELECTORS.targetLang)
  return {
    sourceLangLabel: sourceEl?.textContent?.trim() || null,
    targetLangLabel: targetEl?.textContent?.trim() || null,
  }
}

export function extractTranslation(): ExtractedTranslation | null {
  const mobile = isMobilePage()

  const sourceText = mobile ? readSourceTextMobile() : readSourceTextDesktop()
  const translatedText = mobile ? readTranslatedTextMobile() : readTranslatedTextDesktop()

  if (!sourceText || !translatedText) return null

  const { sourceLang, targetLang } = readLangsFromUrl()
  const { sourceLangLabel, targetLangLabel } = readLangLabels()

  return {
    sourceText,
    translatedText,
    sourceLang,
    targetLang,
    sourceLangLabel,
    targetLangLabel,
    sourceUrl: window.location.href,
  }
}
