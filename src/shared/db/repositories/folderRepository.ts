import { nanoid } from 'nanoid'
import { getDB } from '../db'
import type { Folder, FolderId, CreateFolderInput, DeleteFolderMode } from '../../types/folder'
import { updateTranslation, getTranslationsByFolder } from './translationRepository'
import { AppError } from '../../types/errors'

export async function getFolderById(id: FolderId): Promise<Folder | undefined> {
  const db = await getDB()
  return db.get('folders', id)
}

export async function getAllFolders(includeDeleted = false): Promise<Folder[]> {
  const db = await getDB()
  const all = await db.getAll('folders')
  return includeDeleted ? all : all.filter(f => !f.isDeleted)
}

export async function getFolderChildren(parentId: FolderId | null): Promise<Folder[]> {
  const db = await getDB()
  const all = await db.getAll('folders')
  return all.filter(f => !f.isDeleted && f.parentId === parentId)
}

export async function getDescendantIds(folderId: FolderId): Promise<FolderId[]> {
  const all = await getAllFolders()
  const result: FolderId[] = []
  const queue = [folderId]
  while (queue.length > 0) {
    const current = queue.shift()!
    const children = all.filter(f => f.parentId === current)
    for (const child of children) {
      result.push(child.id)
      queue.push(child.id)
    }
  }
  return result
}

async function buildPathCache(parentId: FolderId | null, name: string): Promise<string> {
  if (!parentId) return name
  const parent = await getFolderById(parentId)
  if (!parent) return name
  return `${parent.pathCache}/${name}`
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const db = await getDB()
  const now = Date.now()
  const siblings = await getFolderChildren(input.parentId)
  const normalizedName = input.name.trim()

  if (!normalizedName) throw new AppError('VALIDATION_ERROR', 'Folder name is required')

  const duplicate = siblings.find(
    s => s.name.toLowerCase() === normalizedName.toLowerCase()
  )
  if (duplicate) throw new AppError('DUPLICATE_FOLDER', `Folder "${normalizedName}" already exists`)

  let depth = 0
  if (input.parentId) {
    const parent = await getFolderById(input.parentId)
    depth = parent ? parent.depth + 1 : 0
  }

  const folder: Folder = {
    id: nanoid(),
    name: normalizedName,
    parentId: input.parentId,
    pathCache: await buildPathCache(input.parentId, normalizedName),
    depth,
    sortOrder: siblings.length,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  }

  await db.put('folders', folder)
  return folder
}

export async function renameFolder(id: FolderId, name: string): Promise<void> {
  const db = await getDB()
  const folder = await getFolderById(id)
  if (!folder) throw new AppError('NOT_FOUND', 'Folder not found')

  const normalizedName = name.trim()
  if (!normalizedName) throw new AppError('VALIDATION_ERROR', 'Folder name is required')

  const siblings = await getFolderChildren(folder.parentId)
  const duplicate = siblings.find(
    s => s.id !== id && s.name.toLowerCase() === normalizedName.toLowerCase()
  )
  if (duplicate) throw new AppError('DUPLICATE_FOLDER', `Folder "${normalizedName}" already exists`)

  const newPathCache = await buildPathCache(folder.parentId, normalizedName)
  await db.put('folders', {
    ...folder,
    name: normalizedName,
    pathCache: newPathCache,
    updatedAt: Date.now(),
  })

  await updateDescendantPaths(id, folder.pathCache, newPathCache)
}

export async function moveFolder(id: FolderId, newParentId: FolderId | null): Promise<void> {
  const db = await getDB()
  const folder = await getFolderById(id)
  if (!folder) throw new AppError('NOT_FOUND', 'Folder not found')
  if (newParentId === id) throw new AppError('INVALID_FOLDER_MOVE', 'Cannot move folder into itself')

  const descendantIds = await getDescendantIds(id)
  if (newParentId && descendantIds.includes(newParentId)) {
    throw new AppError('INVALID_FOLDER_MOVE', 'Cannot move folder into its own descendant')
  }

  let newDepth = 0
  if (newParentId) {
    const newParent = await getFolderById(newParentId)
    newDepth = newParent ? newParent.depth + 1 : 0
  }

  const newPathCache = await buildPathCache(newParentId, folder.name)
  const oldPathCache = folder.pathCache

  await db.put('folders', {
    ...folder,
    parentId: newParentId,
    pathCache: newPathCache,
    depth: newDepth,
    updatedAt: Date.now(),
  })

  await updateDescendantPaths(id, oldPathCache, newPathCache)
}

async function updateDescendantPaths(
  folderId: FolderId,
  oldPrefix: string,
  newPrefix: string
): Promise<void> {
  const db = await getDB()
  const descendantIds = await getDescendantIds(folderId)
  for (const did of descendantIds) {
    const d = await getFolderById(did)
    if (!d) continue
    await db.put('folders', {
      ...d,
      pathCache: d.pathCache.replace(oldPrefix, newPrefix),
      updatedAt: Date.now(),
    })
  }
}

export async function countAllFolders(): Promise<Record<string, number>> {
  const db = await getDB()
  const all = await db.getAll('translations')
  const counts: Record<string, number> = {}
  for (const t of all) {
    if (t.isDeleted || !t.folderId) continue
    counts[t.folderId] = (counts[t.folderId] ?? 0) + 1
  }
  return counts
}

export async function softDeleteFolder(id: FolderId, mode: DeleteFolderMode): Promise<void> {
  const db = await getDB()
  const folder = await getFolderById(id)
  if (!folder) throw new AppError('NOT_FOUND', 'Folder not found')

  const descendantIds = await getDescendantIds(id)
  const affectedFolderIds = [id, ...descendantIds]

  if (mode === 'delete_subtree') {
    for (const fid of affectedFolderIds) {
      const f = await getFolderById(fid)
      if (f) await db.put('folders', { ...f, isDeleted: true, updatedAt: Date.now() })
      const translations = await getTranslationsByFolder([fid])
      for (const t of translations) await updateTranslation(t.id, { isDeleted: true })
    }
  } else if (mode === 'move_translations_to_uncategorized') {
    for (const fid of affectedFolderIds) {
      const f = await getFolderById(fid)
      if (f) await db.put('folders', { ...f, isDeleted: true, updatedAt: Date.now() })
      const translations = await getTranslationsByFolder([fid])
      for (const t of translations) await updateTranslation(t.id, { folderId: null })
    }
  } else if (mode === 'move_children_to_parent') {
    const children = await getFolderChildren(id)
    for (const child of children) await moveFolder(child.id, folder.parentId)
    await db.put('folders', { ...folder, isDeleted: true, updatedAt: Date.now() })
    const translations = await getTranslationsByFolder([id])
    for (const t of translations) await updateTranslation(t.id, { folderId: folder.parentId })
  }
}
