import type { ITranslationProvider, ProviderConfig } from '../../shared/types/provider'

export class LibreTranslateProvider implements ITranslationProvider {
  private config: ProviderConfig
  constructor(config: ProviderConfig) { this.config = config }

  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const endpoint = this.config.endpoint || 'https://libretranslate.com/translate'
    const body: Record<string, string> = { q: text, source: sourceLang, target: targetLang, format: 'text' }
    if (this.config.apiKey) body.api_key = this.config.apiKey
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    const json = await res.json() as { translatedText: string; error?: string }
    if (json.error) throw new Error(json.error)
    return json.translatedText
  }

  async getUsageHint(text: string, sourceLang: string, targetLang: string): Promise<string> {
    // LibreTranslate doesn't have a "hint" API, so we'll use it to generate a simple sentence
    const prompt = `Use this word in a short simple sentence: ${text}`
    return this.translate(prompt, sourceLang, targetLang)
  }
}
