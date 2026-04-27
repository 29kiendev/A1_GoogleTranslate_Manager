import { useState } from 'react'
import type { Folder, FolderId } from '../../shared/types/folder'
import { sendMessage } from '../../shared/services/messagingService'

interface Props {
  folders: Folder[]
  selectedFolderId: FolderId | null
  folderCounts: Record<string, number>
  onSelect: (id: FolderId) => void
  onFoldersChanged: () => void
}

interface FolderNodeProps {
  folder: Folder
  allFolders: Folder[]
  selectedFolderId: FolderId | null
  folderCounts: Record<string, number>
  onSelect: (id: FolderId) => void
  onFoldersChanged: () => void
}

function FolderNode({
  folder,
  allFolders,
  selectedFolderId,
  folderCounts,
  onSelect,
  onFoldersChanged,
}: FolderNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(folder.name)

  const children = allFolders.filter(f => f.parentId === folder.id)
  const isSelected = selectedFolderId === folder.id
  const count = folderCounts[folder.id] ?? 0

  const handleRenameSubmit = async () => {
    if (renameValue.trim() && renameValue !== folder.name) {
      await sendMessage({ type: 'UPDATE_FOLDER', payload: { id: folder.id, name: renameValue.trim() } })
      onFoldersChanged()
    }
    setRenaming(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete folder "${folder.name}"?`)) return
    await sendMessage({
      type: 'DELETE_FOLDER',
      payload: { id: folder.id, mode: 'move_translations_to_uncategorized' },
    })
    onFoldersChanged()
  }

  const handleAddChild = async () => {
    const name = prompt('New folder name:')
    if (!name?.trim()) return
    await sendMessage({ type: 'CREATE_FOLDER', payload: { name: name.trim(), parentId: folder.id } })
    onFoldersChanged()
  }

  return (
    <div>
      <div
        className={`folder-item-row${isSelected ? ' active' : ''}`}
        style={{ paddingLeft: `${folder.depth * 12 + 8}px` }}
        onClick={() => !renaming && onSelect(folder.id)}
      >
        <span
          className="folder-toggle"
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
        >
          {children.length > 0 ? (expanded ? '▾' : '▸') : ''}
        </span>
        <span className="folder-icon">📁</span>
        {renaming ? (
          <input
            className="folder-rename-input"
            value={renameValue}
            autoFocus
            onChange={e => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRenameSubmit()
              if (e.key === 'Escape') setRenaming(false)
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="folder-name">{folder.name}</span>
        )}
        {count > 0 && <span className="folder-count">{count}</span>}
        <div className="folder-actions" onClick={e => e.stopPropagation()}>
          <button className="folder-action-btn" title="Add subfolder" onClick={handleAddChild}>+</button>
          <button className="folder-action-btn" title="Rename" onClick={() => { setRenaming(true); setRenameValue(folder.name) }}>✎</button>
          <button className="folder-action-btn" title="Delete" onClick={handleDelete}>✕</button>
        </div>
      </div>
      {expanded && children.map(child => (
        <FolderNode
          key={child.id}
          folder={child}
          allFolders={allFolders}
          selectedFolderId={selectedFolderId}
          folderCounts={folderCounts}
          onSelect={onSelect}
          onFoldersChanged={onFoldersChanged}
        />
      ))}
    </div>
  )
}

export function SidebarFolderTree({ folders, selectedFolderId, folderCounts, onSelect, onFoldersChanged }: Props) {
  const roots = folders.filter(f => f.parentId === null)

  const handleAddRoot = async () => {
    const name = prompt('New folder name:')
    if (!name?.trim()) return
    await sendMessage({ type: 'CREATE_FOLDER', payload: { name: name.trim(), parentId: null } })
    onFoldersChanged()
  }

  return (
    <>
      <div className="sidebar-section-label">My Folders</div>
      {roots.map(f => (
        <FolderNode
          key={f.id}
          folder={f}
          allFolders={folders}
          selectedFolderId={selectedFolderId}
          folderCounts={folderCounts}
          onSelect={onSelect}
          onFoldersChanged={onFoldersChanged}
        />
      ))}
      <button className="folder-add-btn" onClick={handleAddRoot}>+ New folder</button>
    </>
  )
}
