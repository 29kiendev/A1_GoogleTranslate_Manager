import type { Translation } from '../types/translation'
import type { ReviewRating } from '../types/review'
import { updateTranslation } from '../db/repositories/translationRepository'
import { getSettings, updateSettings } from '../db/repositories/settingsRepository'
import { todayISO } from '../utils/date'
import { AppError } from '../types/errors'

const RATING_TO_SM2_QUALITY: Record<ReviewRating, number> = {
  1: 0,
  2: 3,
  3: 4,
  4: 5,
}

export function computeNextSRS(
  current: Pick<Translation, 'srsInterval' | 'srsEaseFactor' | 'srsRepetitions'>,
  rating: ReviewRating
): { srsInterval: number; srsEaseFactor: number; srsRepetitions: number; nextReviewAt: number } {
  const quality = RATING_TO_SM2_QUALITY[rating]
  let { srsInterval, srsEaseFactor, srsRepetitions } = current

  if (quality < 3) {
    srsRepetitions = 0
    srsInterval = 1
  } else {
    if (srsRepetitions === 0) srsInterval = 1
    else if (srsRepetitions === 1) srsInterval = 6
    else srsInterval = Math.round(srsInterval * srsEaseFactor)
    srsRepetitions += 1
  }

  srsEaseFactor =
    srsEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  srsEaseFactor = Math.max(1.3, srsEaseFactor)

  const nextReviewAt = Date.now() + srsInterval * 86_400_000

  return { srsInterval, srsEaseFactor, srsRepetitions, nextReviewAt }
}

export async function reviewTranslation(
  translation: Translation,
  rating: ReviewRating
): Promise<void> {
  if (rating < 1 || rating > 4) throw new AppError('SRS_INVALID_RATING', 'Rating must be 1–4')

  const next = computeNextSRS(translation, rating)
  await updateTranslation(translation.id, {
    ...next,
    srsEnabled: true,
    lastReviewedAt: Date.now(),
  })

  await updateStreak()
}

export async function enrollTranslation(translation: Translation): Promise<void> {
  await updateTranslation(translation.id, {
    srsEnabled: true,
    srsInterval: 1,
    srsEaseFactor: 2.5,
    srsRepetitions: 0,
    nextReviewAt: Date.now() + 86_400_000,
    lastReviewedAt: null,
  })
}

export async function unenrollTranslation(translation: Translation): Promise<void> {
  await updateTranslation(translation.id, {
    srsEnabled: false,
    nextReviewAt: null,
  })
}

async function updateStreak(): Promise<void> {
  const settings = await getSettings()
  const { reviewStreak } = settings
  const today = todayISO()

  if (reviewStreak.lastReviewDate === today) return

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const isConsecutive = reviewStreak.lastReviewDate === yesterday

  const currentDays = isConsecutive ? reviewStreak.currentDays + 1 : 1
  const longestDays = Math.max(reviewStreak.longestDays, currentDays)

  await updateSettings({
    reviewStreak: { currentDays, lastReviewDate: today, longestDays },
  })
}
