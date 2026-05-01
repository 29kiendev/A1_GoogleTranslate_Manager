import { getSettings } from '../../shared/db/repositories/settingsRepository'
import { MockProvider } from '../providers/mockProvider'
import { CustomHttpProvider } from '../providers/customHttpProvider'
import { LibreTranslateProvider } from '../providers/libreTranslateProvider'
import { DeepLProvider } from '../providers/deepLProvider'
import { GoogleTranslateWebProvider } from '../providers/googleTranslateWebProvider'
import { handleSaveTranslation } from './translationHandlers'
import type { ExtensionResponse, TranslateTextPayload } from '../../shared/types/message'
import type { ITranslationProvider, ProviderConfig } from '../../shared/types/provider'

function buildProvider(config: ProviderConfig): ITranslationProvider {
  switch (config.type) {
    case 'google_translate_web': return new GoogleTranslateWebProvider()
    case 'custom_http':          return new CustomHttpProvider(config)
    case 'libre_translate':      return new LibreTranslateProvider(config)
    case 'deepl':                return new DeepLProvider(config)
    default:                     return new MockProvider()
  }
}

export async function handleTranslateText(payload: TranslateTextPayload): Promise<ExtensionResponse> {
  try {
    const settings = await getSettings()
    const provider = buildProvider(settings.provider)
    const translatedText = await provider.translate(payload.text, payload.sourceLang, payload.targetLang)
    return handleSaveTranslation({
      sourceText: payload.text,
      translatedText,
      sourceLang: payload.sourceLang === 'auto' ? null : payload.sourceLang,
      targetLang: payload.targetLang,
      capturedFromUrl: '',
      captureMode: 'import',
    })
  } catch (e) {
    return { ok: false, error: { code: 'UNKNOWN_ERROR', message: String(e) } }
  }
}

export async function handleGetUsageHint(payload: { text: string; sourceLang: string; targetLang: string }): Promise<ExtensionResponse> {
  try {
    const settings = await getSettings()
    const provider = buildProvider(settings.provider)
    if (!provider.getUsageHint) {
      return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Provider does not support hints' } }
    }
    const hint = await provider.getUsageHint(payload.text, payload.sourceLang, payload.targetLang)
    return { ok: true, data: hint }
  } catch (e) {
    return { ok: false, error: { code: 'UNKNOWN_ERROR', message: String(e) } }
  }
}
