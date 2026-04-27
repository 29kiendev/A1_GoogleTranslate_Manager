import type { ExtractedTranslation } from '../dom/extractor'

interface ContentState {
  current: ExtractedTranslation | null
  savedCount: number | null  // null = not yet checked; 0 = new; N = already saved N times
}

const state: ContentState = {
  current: null,
  savedCount: null,
}

export function setCurrentPayload(payload: ExtractedTranslation): void {
  state.current = payload
  state.savedCount = null
}

export function getCurrentPayload(): ExtractedTranslation | null {
  return state.current
}

export function setSavedCount(count: number): void {
  state.savedCount = count
}

export function getSavedCount(): number | null {
  return state.savedCount
}
