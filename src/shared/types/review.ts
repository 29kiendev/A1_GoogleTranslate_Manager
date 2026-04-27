export type ReviewRating = 1 | 2 | 3 | 4

export interface ReviewSession {
  startedAt: number
  completedAt: number | null
  totalCards: number
  reviewed: number
  ratings: Record<ReviewRating, number>
}
