import type { SmartCollection } from '../types/smartCollection'
import { startOfWeek } from '../utils/date'

export function getBuiltinCollections(): SmartCollection[] {
  return [
    {
      id: 'sc_due_review',
      name: 'Due for Review',
      icon: '🔁',
      query: { dueForReview: true, sortBy: 'nextReviewAt', sortDirection: 'asc' },
    },
    {
      id: 'sc_never_reviewed',
      name: 'Never Reviewed',
      icon: '🆕',
      query: { neverReviewed: true, sortBy: 'createdAt', sortDirection: 'desc' },
    },
    {
      id: 'sc_this_week',
      name: 'Added This Week',
      icon: '📅',
      query: { createdFrom: startOfWeek(), sortBy: 'createdAt', sortDirection: 'desc' },
    },
    {
      id: 'sc_most_used',
      name: 'Most Looked Up',
      icon: '🔥',
      query: { sortBy: 'usageCount', sortDirection: 'desc', limit: 20 },
    },
    {
      id: 'sc_starred',
      name: 'Starred',
      icon: '⭐',
      query: { isStarred: true, sortBy: 'updatedAt', sortDirection: 'desc' },
    },
  ]
}
