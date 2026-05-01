import {
  getTranslationById,
  getDueReviews,
} from '../../shared/db/repositories/translationRepository'
import { getSettings } from '../../shared/db/repositories/settingsRepository'
import { reviewTranslation, enrollTranslation, unenrollTranslation } from '../../shared/services/srsService'
import type { ExtensionResponse } from '../../shared/types/message'
import type { ReviewRating } from '../../shared/types/review'
import { AppError } from '../../shared/types/errors'

export async function handleGetDueReviews(): Promise<ExtensionResponse> {
  try {
    const settings = await getSettings()
    if (!settings.srs.enabled) {
      return {
        ok: false,
        error: { code: 'SRS_DISABLED', message: 'SRS reviews are disabled in settings' },
      }
    }
    const items = await getDueReviews(settings.srs.dailyReviewLimit)
    if (items.length === 0) {
      return { ok: false, error: { code: 'REVIEW_SESSION_EMPTY', message: 'No items due for review' } }
    }
    return { ok: true, data: items }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleReviewTranslation(
  id: string,
  rating: ReviewRating
): Promise<ExtensionResponse> {
  try {
    const t = await getTranslationById(id)
    if (!t) return { ok: false, error: { code: 'NOT_FOUND', message: 'Translation not found' } }
    await reviewTranslation(t, rating)
    const updated = await getTranslationById(id)
    return { ok: true, data: updated }
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: { code: e.code, message: e.message } }
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleEnrollSRS(id: string): Promise<ExtensionResponse> {
  try {
    const t = await getTranslationById(id)
    if (!t) return { ok: false, error: { code: 'NOT_FOUND', message: 'Translation not found' } }
    await enrollTranslation(t)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleUnenrollSRS(id: string): Promise<ExtensionResponse> {
  try {
    const t = await getTranslationById(id)
    if (!t) return { ok: false, error: { code: 'NOT_FOUND', message: 'Translation not found' } }
    await unenrollTranslation(t)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}
