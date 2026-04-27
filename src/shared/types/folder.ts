export type FolderId = string

export interface Folder {
  id: FolderId
  name: string
  parentId: FolderId | null
  pathCache: string
  depth: number
  sortOrder: number
  createdAt: number
  updatedAt: number
  isDeleted: boolean
}

export interface CreateFolderInput {
  name: string
  parentId: FolderId | null
}

export interface MoveFolderInput {
  folderId: FolderId
  newParentId: FolderId | null
}

export type DeleteFolderMode =
  | 'move_children_to_parent'
  | 'delete_subtree'
  | 'move_translations_to_uncategorized'
