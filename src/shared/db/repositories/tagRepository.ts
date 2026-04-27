import { nanoid } from 'nanoid'
import { getDB } from '../db'
import type { Tag, TagId, TranslationTag } from '../../types/tag'

export async function getAllTags(): Promise<Tag[]> {
  const db = await getDB()
  return db.getAll('tags')
}

export async function getTagById(id: TagId): Promise<Tag | undefined> {
  const db = await getDB()
  return db.get('tags', id)
}

export async function getTagBySlug(slug: string): Promise<Tag | undefined> {
  const db = await getDB()
  return db.getFromIndex('tags', 'slug', slug)
}

export async function createTag(name: string, color?: string): Promise<Tag> {
  const db = await getDB()
  const now = Date.now()
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-')
  const tag: Tag = {
    id: nanoid(),
    name: name.trim(),
    slug,
    color: color ?? null,
    createdAt: now,
    updatedAt: now,
  }
  await db.put('tags', tag)
  return tag
}

export async function getTagsForTranslation(translationId: string): Promise<Tag[]> {
  const db = await getDB()
  const links = await db.getAllFromIndex('translation_tags', 'translationId', translationId)
  const tags = await Promise.all(links.map(l => getTagById(l.tagId)))
  return tags.filter((t): t is Tag => t !== undefined)
}

export async function addTagToTranslation(
  translationId: string,
  tagId: TagId
): Promise<void> {
  const db = await getDB()
  const existing = await db.getFromIndex('translation_tags', 'pair', [translationId, tagId] as unknown as [string, string])
  if (existing) return
  const link: TranslationTag = {
    id: nanoid(),
    translationId,
    tagId,
    createdAt: Date.now(),
  }
  await db.put('translation_tags', link)
}

export async function removeTagFromTranslation(
  translationId: string,
  tagId: TagId
): Promise<void> {
  const db = await getDB()
  const existing = await db.getFromIndex('translation_tags', 'pair', [translationId, tagId] as unknown as [string, string])
  if (existing) await db.delete('translation_tags', existing.id)
}
