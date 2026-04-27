export type TagId = string

export interface Tag {
  id: TagId
  name: string
  slug: string
  color?: string | null
  createdAt: number
  updatedAt: number
}

export interface TranslationTag {
  id: string
  translationId: string
  tagId: TagId
  createdAt: number
}
