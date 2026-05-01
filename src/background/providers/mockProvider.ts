import type { ITranslationProvider } from '../../shared/types/provider'

export class MockProvider implements ITranslationProvider {
  async translate(text: string): Promise<string> {
    return `[mock] ${text}`
  }
  async getUsageHint(text: string): Promise<string> {
    return `[mock hint] This is how you use "${text}" in a sentence.`
  }
}
