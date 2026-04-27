import { useState, useEffect, useCallback, useRef } from 'react'
import { SearchBox } from './components/SearchBox'
import { TranslationCard } from './components/TranslationCard'
import { FolderSelect } from './components/FolderSelect'
import { sendMessage } from '../shared/services/messagingService'
import type { Translation } from '../shared/types/translation'
import type { Folder } from '../shared/types/folder'

function copyText(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  })
}

export default function PopupApp() {
  const [query, setQuery] = useState('')
  const [folderFilter, setFolderFilter] = useState<string | null>(null)
  const [starFilter, setStarFilter] = useState(false)
  const [items, setItems] = useState<Translation[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [dueCount, setDueCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [moveTarget, setMoveTarget] = useState<Translation | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const load = useCallback(async (q: string, folderId: string | null, starred: boolean) => {
    setLoading(true)
    const res = q || folderId || starred
      ? await sendMessage<{ items: Translation[]; total: number }>({
          type: 'SEARCH_TRANSLATIONS',
          payload: {
            q: q || undefined,
            folderId: folderId ?? undefined,
            isStarred: starred || undefined,
            limit: 30,
            sortBy: 'lastUsedAt',
            sortDirection: 'desc',
          },
        })
      : await sendMessage<Translation[]>({ type: 'GET_RECENT_TRANSLATIONS' })

    if (res?.ok) {
      setItems(Array.isArray(res.data) ? res.data : (res.data as { items: Translation[] })?.items ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    sendMessage<Folder[]>({ type: 'GET_FOLDER_TREE' }).then(r => {
      if (r?.ok && r.data) setFolders(r.data)
    })
    sendMessage<number>({ type: 'GET_DUE_COUNT' }).then(r => {
      if (r?.ok && r.data !== undefined) setDueCount(r.data as number)
    })
    load('', null, false)
  }, [load])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(query, folderFilter, starFilter), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, folderFilter, starFilter, load])

  const handleStar = async (t: Translation) => {
    await sendMessage({ type: 'STAR_TRANSLATION', payload: t.id })
    setItems(prev => prev.map(i => i.id === t.id ? { ...i, isStarred: !i.isStarred } : i))
  }

  const handleMoveConfirm = async (folderId: string | null) => {
    if (!moveTarget) return
    await sendMessage({ type: 'MOVE_TRANSLATION', payload: { id: moveTarget.id, folderId } })
    setItems(prev => prev.map(i => i.id === moveTarget.id ? { ...i, folderId } : i))
    setMoveTarget(null)
  }

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') })
  }

  return (
    <div className="popup-root">
      <header className="popup-header">
        <span className="popup-title">Translate Vault</span>
        <div className="header-right">
          {dueCount > 0 && (
            <span className="due-badge" title="Cards due for review" onClick={openDashboard}>
              🔁 {dueCount}
            </span>
          )}
          <button className="dashboard-btn" onClick={openDashboard}>Dashboard</button>
        </div>
      </header>

      <div className="popup-controls">
        <SearchBox value={query} onChange={setQuery} />
        <div className="filter-row">
          <FolderSelect folders={folders} value={folderFilter} onChange={setFolderFilter} />
          <button
            className={`star-filter${starFilter ? ' active' : ''}`}
            onClick={() => setStarFilter(v => !v)}
            title="Starred only"
          >
            ★
          </button>
        </div>
      </div>

      <div className="popup-list">
        {loading && <div className="empty-state">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="empty-state">No translations found</div>
        )}
        {!loading && items.map(item => (
          <TranslationCard
            key={item.id}
            item={item}
            onCopyOriginal={t => copyText(t.sourceText)}
            onCopyTranslation={t => copyText(t.translatedText)}
            onCopyBoth={t => copyText(`Original: ${t.sourceText}\nTranslation: ${t.translatedText}`)}
            onStar={handleStar}
            onMove={t => setMoveTarget(t)}
          />
        ))}
      </div>

      {moveTarget && (
        <div className="move-overlay">
          <div className="move-dialog">
            <div className="move-title">Move to folder</div>
            <FolderSelect
              folders={folders}
              value={moveTarget.folderId}
              onChange={handleMoveConfirm}
            />
            <button className="move-cancel" onClick={() => setMoveTarget(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
