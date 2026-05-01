export type ProviderType = 'google_translate_web' | 'mock' | 'custom_http' | 'google_cloud' | 'deepl' | 'libre_translate'

export interface ProviderConfig {
  type: ProviderType
  apiKey?: string
  endpoint?: string
}

export interface ITranslationProvider {
  translate(text: string, sourceLang: string, targetLang: string): Promise<string>
  getUsageHint?(text: string, sourceLang: string, targetLang: string): Promise<string>
}
