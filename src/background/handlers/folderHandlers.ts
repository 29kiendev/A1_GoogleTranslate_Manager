import {
  getAllFolders,
  getFolderById,
  createFolder,
  renameFolder,
  moveFolder,
  softDeleteFolder,
  countAllFolders,
} from '../../shared/db/repositories/folderRepository'
import type { ExtensionResponse } from '../../shared/types/message'
import type { CreateFolderInput, FolderId, DeleteFolderMode } from '../../shared/types/folder'
import { AppError } from '../../shared/types/errors'

export async function handleGetFolderTree(): Promise<ExtensionResponse> {
  try {
    const folders = await getAllFolders()
    return { ok: true, data: folders }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleCreateFolder(input: CreateFolderInput): Promise<ExtensionResponse> {
  try {
    const folder = await createFolder(input)
    return { ok: true, data: folder }
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: { code: e.code, message: e.message } }
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleUpdateFolder(
  id: FolderId,
  name: string
): Promise<ExtensionResponse> {
  try {
    await renameFolder(id, name)
    const folder = await getFolderById(id)
    return { ok: true, data: folder }
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: { code: e.code, message: e.message } }
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleDeleteFolder(
  id: FolderId,
  mode: DeleteFolderMode
): Promise<ExtensionResponse> {
  try {
    await softDeleteFolder(id, mode)
    return { ok: true }
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: { code: e.code, message: e.message } }
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleGetFolderCounts(): Promise<ExtensionResponse> {
  try {
    return { ok: true, data: await countAllFolders() }
  } catch (e) {
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}

export async function handleMoveFolder(
  id: FolderId,
  newParentId: FolderId | null
): Promise<ExtensionResponse> {
  try {
    await moveFolder(id, newParentId)
    return { ok: true }
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: { code: e.code, message: e.message } }
    return { ok: false, error: { code: 'DB_ERROR', message: String(e) } }
  }
}
