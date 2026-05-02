import type { ExtensionResponse } from '../../shared/types/message'
import * as repo from '../../shared/db/repositories/phrasebookRepository'

export async function handleCreatePhrasebook(payload: { name: string; description?: string }): Promise<ExtensionResponse> {
  try {
    const data = await repo.createPhrasebook(payload.name, payload.description)
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleGetPhrasebooks(): Promise<ExtensionResponse> {
  try {
    const data = await repo.getPhrasebooks()
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleDeletePhrasebook(payload: { id: string }): Promise<ExtensionResponse> {
  try {
    await repo.deletePhrasebook(payload.id)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleAddToPhrasebook(payload: { phrasebookId: string; translationId: string }): Promise<ExtensionResponse> {
  try {
    const data = await repo.addToPhrasebook(payload.phrasebookId, payload.translationId)
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleRemoveFromPhrasebook(payload: { phrasebookId: string; translationId: string }): Promise<ExtensionResponse> {
  try {
    await repo.removeFromPhrasebook(payload.phrasebookId, payload.translationId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleGetPhrasebookItems(payload: { phrasebookId: string }): Promise<ExtensionResponse> {
  try {
    const data = await repo.getPhrasebookItems(payload.phrasebookId)
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleReorderPhrasebookItem(payload: { itemId: string; newOrder: number }): Promise<ExtensionResponse> {
  try {
    await repo.reorderPhrasebookItem(payload.itemId, payload.newOrder)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}
