import { extractTranslation, type ExtractedTranslation } from './extractor'

const DEBOUNCE_MS = 700

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let lastPayloadKey = ''

function payloadKey(p: ExtractedTranslation): string {
  return `${p.sourceText}::${p.translatedText}::${p.sourceLang ?? ''}::${p.targetLang ?? ''}`
}

export function startObserver(
  onDetected: (payload: ExtractedTranslation) => void
): MutationObserver {
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      const payload = extractTranslation()
      if (!payload) return
      const key = payloadKey(payload)
      if (key === lastPayloadKey) return
      lastPayloadKey = key
      onDetected(payload)
    }, DEBOUNCE_MS)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  return observer
}
