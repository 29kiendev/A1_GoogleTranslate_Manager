import type { ITranslationProvider, ProviderConfig } from '../../shared/types/provider'

export class CustomHttpProvider implements ITranslationProvider {
  private config: ProviderConfig
  constructor(config: ProviderConfig) { this.config = config }

  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`
    const res = await fetch(this.config.endpoint!, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, sourceLang, targetLang, task: 'translate' }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    const json = await res.json() as { translatedText: string }
    return json.translatedText
  }

  async getUsageHint(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`
    const res = await fetch(this.config.endpoint!, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, sourceLang, targetLang, task: 'usage_hint' }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    const json = await res.json() as { hint: string }
    return json.hint
  }
}
