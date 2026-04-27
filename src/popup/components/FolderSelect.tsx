import type { Folder } from '../../shared/types/folder'

interface Props {
  folders: Folder[]
  value: string | null
  onChange: (v: string | null) => void
}

export function FolderSelect({ folders, value, onChange }: Props) {
  return (
    <select
      className="folder-select"
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
    >
      <option value="">All folders</option>
      {folders.map(f => (
        <option key={f.id} value={f.id}>
          {'  '.repeat(f.depth)}{f.name}
        </option>
      ))}
    </select>
  )
}
