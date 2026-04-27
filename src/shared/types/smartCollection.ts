import type { SearchTranslationsQuery } from './translation'

export interface SmartCollection {
  id: string
  name: string
  icon: string
  query: SearchTranslationsQuery
}
