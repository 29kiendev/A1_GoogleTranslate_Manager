export interface Phrasebook {
  id: string          // nanoid
  name: string
  description: string | null
  isDeleted: boolean
  createdAt: number
  updatedAt: number
}

export interface PhrasebookItem {
  id: string          // nanoid
  phrasebookId: string
  translationId: string
  order: number       // for manual reordering
  addedAt: number
}
