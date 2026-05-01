import type { ITranslationProvider, ProviderConfig } from '../../shared/types/provider'

export class DeepLProvider implements ITranslationProvider {
  private config: ProviderConfig
  constructor(config: ProviderConfig) { this.config = config }

  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const endpoint = this.config.endpoint || 'https://api-free.deepl.com/v2/translate'
    const params = new URLSearchParams({
      text,
      source_lang: sourceLang.toUpperCase(),
      target_lang: targetLang.toUpperCase(),
    })
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.config.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    const json = await res.json() as { translations: { text: string }[] }
    const result = json.translations?.[0]?.text
    if (!result) throw new Error('Empty response from DeepL')
    return result
  }

  async getUsageHint(text: string, sourceLang: string, targetLang: string): Promise<string> {
    // DeepL doesn't have a generative hint API, so we'll just return a translated example prompt
    const prompt = `Example sentence for "${text}":`
    return this.translate(prompt, sourceLang, targetLang)
  }
}
