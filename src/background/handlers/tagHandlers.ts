import {
  getAllTags,
  createTag,
  getTagsForTranslation,
  addTagToTranslation,
  removeTagFromTranslation,
} from '../../shared/db/repositories/tagRepository'
import type { ExtensionResponse } from '../../shared/types/message'

export async function handleGetTags(): Promise<ExtensionResponse> {
  try {
    return { ok: true, data: await getAllTags() }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleGetTagsForTranslation(translationId: string): Promise<ExtensionResponse> {
  try {
    return { ok: true, data: await getTagsForTranslation(translationId) }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleCreateTag(payload: { name: string; color?: string }): Promise<ExtensionResponse> {
  try {
    return { ok: true, data: await createTag(payload.name, payload.color) }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleAddTagToTranslation(payload: { translationId: string; tagId: string }): Promise<ExtensionResponse> {
  try {
    await addTagToTranslation(payload.translationId, payload.tagId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleRemoveTagFromTranslation(payload: { translationId: string; tagId: string }): Promise<ExtensionResponse> {
  try {
    await removeTagFromTranslation(payload.translationId, payload.tagId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}
