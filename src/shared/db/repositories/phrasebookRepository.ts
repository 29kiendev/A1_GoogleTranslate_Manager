import { nanoid } from 'nanoid'
import { getDB } from '../db'
import type { Phrasebook, PhrasebookItem } from '../../types/phrasebook'

export async function getPhrasebooks(): Promise<Phrasebook[]> {
  const db = await getDB()
  const all = await db.getAll('phrasebooks')
  return all.filter(p => !p.isDeleted)
}

export async function createPhrasebook(name: string, description?: string): Promise<Phrasebook> {
  const db = await getDB()
  const now = Date.now()
  const phrasebook: Phrasebook = {
    id: nanoid(),
    name,
    description: description || null,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }
  await db.put('phrasebooks', phrasebook)
  return phrasebook
}

export async function deletePhrasebook(id: string): Promise<void> {
  const db = await getDB()
  const phrasebook = await db.get('phrasebooks', id)
  if (phrasebook) {
    phrasebook.isDeleted = true
    phrasebook.updatedAt = Date.now()
    await db.put('phrasebooks', phrasebook)
  }
}

export async function addToPhrasebook(phrasebookId: string, translationId: string): Promise<PhrasebookItem> {
  const db = await getDB()
  
  // Check if already exists to avoid unique constraint error
  const existing = await db.getFromIndex('phrasebook_items', 'pair', [phrasebookId, translationId])
  if (existing) return existing

  // Get current max order
  const items = await db.getAllFromIndex('phrasebook_items', 'phrasebookId', phrasebookId)
  const maxOrder = items.reduce((max: number, item: PhrasebookItem) => Math.max(max, item.order), -1)

  const item: PhrasebookItem = {
    id: nanoid(),
    phrasebookId,
    translationId,
    order: maxOrder + 1,
    addedAt: Date.now(),
  }
  await db.add('phrasebook_items', item)
  return item
}

export async function removeFromPhrasebook(phrasebookId: string, translationId: string): Promise<void> {
  const db = await getDB()
  const item = await db.getFromIndex('phrasebook_items', 'pair', [phrasebookId, translationId])
  if (item) {
    await db.delete('phrasebook_items', item.id)
  }
}

export async function getPhrasebookItems(phrasebookId: string): Promise<PhrasebookItem[]> {
  const db = await getDB()
  const items = await db.getAllFromIndex('phrasebook_items', 'phrasebookId', phrasebookId)
  return items.sort((a: PhrasebookItem, b: PhrasebookItem) => a.order - b.order)
}

export async function reorderPhrasebookItem(itemId: string, newOrder: number): Promise<void> {
  const db = await getDB()
  const item = await db.get('phrasebook_items', itemId)
  if (item) {
    item.order = newOrder
    await db.put('phrasebook_items', item)
  }
}
