import type { ITranslationProvider } from '../../shared/types/provider'

const API_URL = 'https://translate.googleapis.com/translate_a/single'

export class GoogleTranslateWebProvider implements ITranslationProvider {
  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: sourceLang || 'auto',
      tl: targetLang,
      dt: 't',
      q: text,
    })
    const res = await fetch(`${API_URL}?${params}`)
    if (!res.ok) throw new Error(`Google Translate error: HTTP ${res.status}`)
    const data: unknown = await res.json()
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      throw new Error('Unexpected response from Google Translate')
    }
    return (data[0] as [string, ...unknown[]][])
      .map(seg => seg[0] ?? '')
      .join('')
  }
}
