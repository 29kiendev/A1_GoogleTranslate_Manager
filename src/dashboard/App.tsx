import { useState, useEffect, useCallback, useRef } from 'react'
import { SidebarSmartCollections } from './components/SidebarSmartCollections'
import { SidebarFolderTree } from './components/SidebarFolderTree'
import { TranslationList } from './components/TranslationList'
import { TranslationDetail } from './components/TranslationDetail'
import { sendMessage } from '../shared/services/messagingService'
import { startOfWeek } from '../shared/utils/date'
import type { Translation, SearchTranslationsQuery, LangPairCount } from '../shared/types/translation'
import type { Folder, FolderId } from '../shared/types/folder'
import type { Tag } from '../shared/types/tag'
import type { SmartCollection } from '../shared/types/smartCollection'
import type { AppSettings } from '../shared/types/settings'

type View = 'list' | 'review' | 'batch_import' | 'settings' | 'translate' | 'stats' | 'phrasebook'

const PAGE_SIZE = 50

export default function DashboardApp() {
  const [view, setView] = useState<View>('list')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Translation[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({})
  const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({})
  const [tagsMap, setTagsMap] = useState<Map<string, Tag[]>>(new Map())
  const [dueCount, setDueCount] = useState(0)
  const [langPairs, setLangPairs] = useState<LangPairCount[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [autoExpandId, setAutoExpandId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sidebarKey, setSidebarKey] = useState<string>('sc_all')
  const [activeQuery, setActiveQuery] = useState<SearchTranslationsQuery>({
    sortBy: 'lastUsedAt',
    sortDirection: 'desc',
    limit: PAGE_SIZE,
  })
  const [tags, setTags] = useState<Tag[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const selectedIndex = items.findIndex(t => t.id === selectedId)
  const selectedItem = items[selectedIndex] ?? null
  const isTrashActive = sidebarKey === 'sc_trash'

  const loadTagsForItems = useCallback(async (newItems: Translation[], append: boolean) => {
    const map = new Map<string, Tag[]>()
    await Promise.all(
      newItems.map(async t => {
        const res = await sendMessage<Tag[]>({ type: 'GET_TAGS_FOR_TRANSLATION', payload: t.id })
        if (res?.ok && res.data && res.data.length > 0) map.set(t.id, res.data)
      })
    )
    setTagsMap(prev => {
      if (!append) return map
      const merged = new Map(prev)
      for (const [k, v] of map) merged.set(k, v)
      return merged
    })
  }, [])

  const loadTranslations = useCallback(async (q: SearchTranslationsQuery, append = false) => {
    setLoading(true)
    const res = await sendMessage<{ items: Translation[]; total: number }>({
      type: 'SEARCH_TRANSLATIONS',
      payload: q,
    })
    if (res?.ok && res.data) {
      setItems(prev => append ? [...prev, ...res.data!.items] : res.data!.items)
      setTotal(res.data.total)
      loadTagsForItems(res.data.items, append)
    }
    setLoading(false)
  }, [loadTagsForItems])

  const loadSidebar = useCallback(async () => {
    const [fRes, lpRes, dcRes, fcRes, tRes, sRes, scRes] = await Promise.all([
      sendMessage<Folder[]>({ type: 'GET_FOLDER_TREE' }),
      sendMessage<LangPairCount[]>({ type: 'GET_LANG_PAIRS' }),
      sendMessage<number>({ type: 'GET_DUE_COUNT' }),
      sendMessage<Record<string, number>>({ type: 'GET_FOLDER_COUNTS' }),
      sendMessage<Tag[]>({ type: 'GET_TAGS' }),
      sendMessage<AppSettings>({ type: 'GET_SETTINGS' }),
      sendMessage<Record<string, number>>({ type: 'GET_SMART_COLLECTION_COUNTS' }),
    ])
    if (fRes?.ok && fRes.data) setFolders(fRes.data)
    if (lpRes?.ok && lpRes.data) setLangPairs(lpRes.data)
    if (dcRes?.ok) setDueCount(dcRes.data as number ?? 0)
    if (fcRes?.ok && fcRes.data) setFolderCounts(fcRes.data)
    if (tRes?.ok && tRes.data) setTags(tRes.data)
    if (sRes?.ok && sRes.data) setSettings(sRes.data)
    if (scRes?.ok && scRes.data) setCollectionCounts(scRes.data ?? {})
  }, [])

  useEffect(() => {
    loadSidebar()
    loadTranslations(activeQuery)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const q = { ...activeQuery, q: query || undefined, offset: 0 }
      setOffset(0)
      loadTranslations(q)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectCollection = (c: SmartCollection) => {
    setView('list')
    setSidebarKey(c.id)
    setSelectedId(null)
    setAutoExpandId(null)
    setSelectedIds(new Set())
    setOffset(0)
    const q: SearchTranslationsQuery = { ...c.query, q: query || undefined, limit: PAGE_SIZE, offset: 0 }
    setActiveQuery(q)
    loadTranslations(q)
  }

  const selectLangPair = (sourceLang: string, targetLang: string) => {
    setView('list')
    const key = `lp_${sourceLang}_${targetLang}`
    setSidebarKey(key)
    setSelectedId(null)
    setAutoExpandId(null)
    setSelectedIds(new Set())
    setOffset(0)
    const q: SearchTranslationsQuery = {
      sourceLang,
      targetLang,
      q: query || undefined,
      sortBy: 'lastUsedAt',
      sortDirection: 'desc',
      limit: PAGE_SIZE,
      offset: 0,
    }
    setActiveQuery(q)
    loadTranslations(q)
  }

  const selectTag = (tagId: string) => {
    setView('list')
    setSidebarKey(`tag_${tagId}`)
    setSelectedId(null)
    setAutoExpandId(null)
    setSelectedIds(new Set())
    setOffset(0)
    const q: SearchTranslationsQuery = {
      tagIds: [tagId],
      q: query || undefined,
      sortBy: 'lastUsedAt',
      sortDirection: 'desc',
      limit: PAGE_SIZE,
      offset: 0,
    }
    setActiveQuery(q)
    loadTranslations(q)
  }

  const selectFolder = (id: FolderId) => {
    setView('list')
    setSidebarKey(`folder_${id}`)
    setSelectedId(null)
    setAutoExpandId(null)
    setSelectedIds(new Set())
    setOffset(0)
    const q: SearchTranslationsQuery = {
      folderId: id,
      q: query || undefined,
      sortBy: 'lastUsedAt',
      sortDirection: 'desc',
      limit: PAGE_SIZE,
      offset: 0,
    }
    setActiveQuery(q)
    loadTranslations(q)
  }

  const handleLoadMore = () => {
    const newOffset = offset + PAGE_SIZE
    setOffset(newOffset)
    const q = { ...activeQuery, offset: newOffset }
    loadTranslations(q, true)
  }

  const handleStar = async (t: Translation) => {
    await sendMessage({ type: 'STAR_TRANSLATION', payload: t.id })
    setItems(prev => prev.map(i => i.id === t.id ? { ...i, isStarred: !i.isStarred } : i))
    loadSidebar() // Refresh counts
  }

  const handleDoubleClick = (t: Translation) => {
    setSelectedId(t.id)
    setAutoExpandId(t.id)
  }

  const handlePrev = () => {
    if (selectedIndex > 0) {
      setSelectedId(items[selectedIndex - 1].id)
      setAutoExpandId(null)
    }
  }

  const handleNext = () => {
    if (selectedIndex < items.length - 1) {
      setSelectedId(items[selectedIndex + 1].id)
      setAutoExpandId(null)
    } else if (items.length < total) {
      handleLoadMore()
    }
  }

  const handleUpdated = (updated: Translation) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
    loadSidebar()
  }

  const handleDeleted = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    setTotal(t => t - 1)
    setSelectedId(null)
    setAutoExpandId(null)
    loadSidebar()
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (!confirm(isTrashActive ? `Permanently delete ${selectedIds.size} translation(s)?` : `Delete ${selectedIds.size} translation(s)?`)) return
    for (const id of selectedIds) {
      await sendMessage({ type: isTrashActive ? 'PERMANENT_DELETE_TRANSLATION' : 'DELETE_TRANSLATION', payload: id })
    }
    setItems(prev => prev.filter(i => !selectedIds.has(i.id)))
    setTotal(t => t - selectedIds.size)
    setSelectedIds(new Set())
    loadSidebar()
  }

  const handleBulkRestore = async () => {
    for (const id of selectedIds) {
      await sendMessage({ type: 'RESTORE_TRANSLATION', payload: id })
    }
    setItems(prev => prev.filter(i => !selectedIds.has(i.id)))
    setTotal(t => t - selectedIds.size)
    setSelectedIds(new Set())
    loadSidebar()
  }

  const handleBulkStar = async () => {
    for (const id of selectedIds) {
      await sendMessage({ type: 'STAR_TRANSLATION', payload: id })
    }
    setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, isStarred: true } : i))
    setSelectedIds(new Set())
    loadSidebar()
  }

  const handleEmptyTrash = async () => {
    if (!confirm('Permanently delete all items in Trash? This cannot be undone.')) return
    await sendMessage({ type: 'EMPTY_TRASH' })
    loadTranslations(activeQuery)
    loadSidebar()
  }

  const handleImportJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const res = await sendMessage<{ inserted: number; updated: number; skipped: number }>({
          type: 'IMPORT_DATA',
          payload: { data, options: { mergeStrategy: 'merge', duplicateStrategy: 'skip' } },
        })
        if (res?.ok && res.data) {
          alert(`Import complete:\n- New items: ${res.data.inserted}\n- Updated/Merged: ${res.data.updated}\n- Skipped: ${res.data.skipped}`)
          loadTranslations(activeQuery)
          loadSidebar()
        } else {
          alert(`Import failed: ${res?.error?.message ?? 'Unknown error'}`)
        }
      } catch {
        alert('Failed to parse JSON file')
      }
    }
    input.click()
  }

  const handleExport = async (format: 'json' | 'anki_tsv' | 'markdown') => {
    const res = await sendMessage<string | object>({
      type: 'EXPORT_DATA',
      payload: { format, query: activeQuery },
    })
    if (!res?.ok || !res.data) return

    let content: string
    let filename: string
    let mime: string
    const date = new Date().toISOString().slice(0, 10)

    if (format === 'json') {
      content = JSON.stringify(res.data, null, 2)
      filename = `translate-vault-export-${date}.json`
      mime = 'application/json'
    } else if (format === 'anki_tsv') {
      content = res.data as string
      filename = `translate-vault-anki-${date}.txt`
      mime = 'text/plain'
    } else {
      content = res.data as string
      filename = `translate-vault-${date}.md`
      mime = 'text/markdown'
    }

    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const showReviewButton = settings?.srs?.enabled && dueCount > 0
  const streak = settings?.reviewStreak?.currentDays ?? 0
  const learningEnabled = settings?.learningMode?.enabled ?? true

  return (
    <div className="layout">
      {/* Topbar */}
      <div className="topbar">
        <span className="topbar-title">Translate Vault</span>
        <div className="topbar-search">
          <input
            type="text"
            placeholder="Search translations…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="topbar-actions">
          {streak > 1 && (
            <span className="streak-badge" title="Daily review streak">🔥 {streak}</span>
          )}
          {learningEnabled && showReviewButton && (
            <button className="btn" onClick={() => setView('review')} style={{ color: '#1a73e8' }}>
              🎯 Review ({dueCount})
            </button>
          )}
          {isTrashActive && (
            <button className="btn btn-danger" onClick={handleEmptyTrash}>Empty Trash</button>
          )}
          <button className="btn btn-primary" onClick={() => setView('translate')}>+ Translate</button>
          <button className="btn" onClick={() => setView('batch_import')}>+ Batch Import</button>
          <button className="btn" onClick={() => setView('stats')} title="Statistics">📊 Stats</button>
          {learningEnabled && (
            <button className="btn" onClick={() => setView('phrasebook')} title="Phrasebook">📚 Phrasebook</button>
          )}
          <div style={{ position: 'relative' }}>
            <button className="btn" onClick={() => setMoreOpen(v => !v)}>⋯ More</button>
            {moreOpen && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)', zIndex: 50, minWidth: 160, padding: '4px 0' }} onClick={() => setMoreOpen(false)}>
                <button className="btn" style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: 0, padding: '8px 16px' }} onClick={() => handleExport('json')}>Export JSON</button>
                <button className="btn" style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: 0, padding: '8px 16px' }} onClick={() => handleExport('anki_tsv')}>Export Anki TSV</button>
                <button className="btn" style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: 0, padding: '8px 16px' }} onClick={() => handleExport('markdown')}>Export Markdown</button>
                <hr style={{ margin: '4px 0', borderColor: 'var(--border)' }} />
                <button className="btn" style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: 0, padding: '8px 16px' }} onClick={handleImportJSON}>Import JSON</button>
              </div>
            )}
          </div>
          <button className="btn-icon" title="Settings" onClick={() => setView('settings')}>⚙</button>
        </div>
      </div>

      <div className="body-area">
        {/* Sidebar */}
        <div className="sidebar">
          <SidebarSmartCollections
            selected={sidebarKey}
            dueCount={dueCount}
            collectionCounts={collectionCounts}
            langPairs={langPairs}
            tags={tags}
            onSelectCollection={selectCollection}
            onSelectLangPair={selectLangPair}
            onSelectTag={selectTag}
          />
          <SidebarFolderTree
            folders={folders}
            selectedFolderId={sidebarKey.startsWith('folder_') ? sidebarKey.slice(7) : null}
            folderCounts={folderCounts}
            onSelect={selectFolder}
            onFoldersChanged={loadSidebar}
          />
        </div>

        {/* Main panel */}
        <div className="main-panel">
          {view === 'review' && (
            <ReviewView
              dueCount={dueCount}
              streak={streak}
              onExit={() => { setView('list'); loadSidebar() }}
            />
          )}
          {view === 'translate' && (
            <TranslateView folders={folders} onDone={() => { setView('list'); loadTranslations(activeQuery); loadSidebar() }} />
          )}
          {view === 'batch_import' && (
            <BatchImportView folders={folders} onDone={() => { setView('list'); loadTranslations(activeQuery); loadSidebar() }} />
          )}
          {view === 'settings' && (
            <SettingsView onClose={() => setView('list')} />
          )}
          {view === 'stats' && (
            <StatsView langPairs={langPairs} dueCount={dueCount} learningEnabled={learningEnabled} />
          )}
          {view === 'phrasebook' && (
            <PhrasebookView />
          )}
          {view === 'list' && (
            <>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {selectedIds.size > 0 && (
                  <div className="bulk-bar">
                    <span>{selectedIds.size} selected</span>
                    {!isTrashActive && <button className="bulk-btn" onClick={handleBulkStar}>★ Star all</button>}
                    {isTrashActive && <button className="bulk-btn" onClick={handleBulkRestore}>Restore selected</button>}
                    <button className="bulk-btn" onClick={handleBulkDelete}>🗑️ {isTrashActive ? 'Delete permanently' : 'Delete all'}</button>
                    <button className="bulk-btn" onClick={() => setSelectedIds(new Set())}>Clear</button>
                  </div>
                )}
                <TranslationList
                  items={items}
                  total={total}
                  selected={selectedId}
                  selectedIds={selectedIds}
                  loading={loading}
                  tagsMap={tagsMap}
                  onSelect={t => { setSelectedId(t.id); setAutoExpandId(null) }}
                  onToggleSelect={handleToggleSelect}
                  onDoubleClick={handleDoubleClick}
                  onStar={handleStar}
                  onLoadMore={handleLoadMore}
                  hasMore={items.length < total}
                />
              </div>
              {selectedItem && (
                <TranslationDetail
                  item={selectedItem}
                  folders={folders}
                  autoExpand={autoExpandId === selectedItem.id}
                  hasPrev={selectedIndex > 0}
                  hasNext={selectedIndex < total - 1}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  learningEnabled={learningEnabled}
                  onClose={() => { setSelectedId(null); setAutoExpandId(null) }}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// —— Inline sub-views (M7, M8, M10) —————————————————————————————————————————————

function ReviewView({ dueCount, streak, onExit }: { dueCount: number; streak: number; onExit: () => void }) {
  const [queue, setQueue] = useState<Translation[]>([])
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)
  const [ratings, setRatings] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 })
  const [started, setStarted] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [loadingHint, setLoadingHint] = useState(false)

  const start = async () => {
    const res = await sendMessage<Translation[]>({ type: 'GET_DUE_REVIEWS' })
    if (res?.ok && res.data) { setQueue(res.data); setStarted(true) }
  }

  const rate = async (rating: 1 | 2 | 3 | 4) => {
    const current = queue[idx]
    
    if (rating === 1 && !hint) {
      setLoadingHint(true)
      const res = await sendMessage<string>({ 
        type: 'GET_USAGE_HINT', 
        payload: { 
          text: current.sourceText, 
          sourceLang: current.sourceLang || 'auto', 
          targetLang: current.targetLang || 'en' 
        } 
      })
      setLoadingHint(false)
      if (res?.ok && res.data) {
        setHint(res.data)
        return // Wait for user to read hint
      }
    }

    await sendMessage({ type: 'REVIEW_TRANSLATION', payload: { id: current.id, rating } })
    setRatings(prev => ({ ...prev, [rating]: prev[rating] + 1 }))
    if (idx + 1 >= queue.length) { setDone(true) }
    else { setIdx(i => i + 1); setRevealed(false); setHint(null) }
  }

  if (!started) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 40 }}>🎯</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{dueCount} cards due for review</div>
      {streak > 1 && <div style={{ fontSize: 14, color: '#ff9800' }}>🔥 {streak} day streak! Keep it up.</div>}
      <button className="btn btn-primary" onClick={start}>Start Review</button>
      <button className="btn" onClick={onExit}>Back to Vault</button>
    </div>
  )

  if (done || queue.length === 0) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ fontSize: 40 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Review Complete!</div>
      <div style={{ color: '#5f6368' }}>
        Reviewed {queue.length} cards —
        Didn't know: {ratings[1]} · Hard: {ratings[2]} · Good: {ratings[3]} · Easy: {ratings[4]}
      </div>
      {streak > 0 && <div style={{ fontSize: 14, color: '#ff9800' }}>🔥 Current streak: {streak} day{streak === 1 ? '' : 's'}</div>}
      <button className="btn btn-primary" onClick={onExit}>Back to Vault</button>
    </div>
  )

  const card = queue[idx]
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
      <div style={{ alignSelf: 'stretch', display: 'flex', justifyContent: 'space-between', color: '#5f6368', fontSize: 12 }}>
        <span>{idx + 1} / {queue.length}</span>
        <button className="btn" onClick={onExit}>Exit</button>
      </div>
      <div style={{ background: '#f8f9fa', border: '1px solid #e8eaed', borderRadius: 12, padding: 32, maxWidth: 500, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#1a73e8', fontWeight: 600, marginBottom: 16 }}>
          {((card.sourceLangLabel && card.targetLangLabel) ? `${card.sourceLangLabel} → ${card.targetLangLabel}` : `${(card.sourceLang ?? '?').toUpperCase()} → ${(card.targetLang ?? '?').toUpperCase()}`)}
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, marginBottom: (revealed || hint) ? 24 : 0 }}>{card.sourceText}</div>
        {revealed && (
          <div style={{ borderTop: '1px solid #e8eaed', marginTop: 16, paddingTop: 16, fontSize: 20, color: '#1a73e8', fontWeight: 500 }}>
            {card.translatedText}
          </div>
        )}
        {hint && (
          <div style={{ marginTop: 16, padding: 12, background: '#e8f0fe', borderRadius: 8, fontSize: 14, color: '#185abc', textAlign: 'left', fontStyle: 'italic' }}>
            💡 {hint}
          </div>
        )}
        {loadingHint && <div style={{ marginTop: 16, fontSize: 12, color: '#5f6368' }}>Fetching hint…</div>}
      </div>
      {!revealed ? (
        <button className="btn btn-primary" onClick={() => setRevealed(true)}>Reveal Translation</button>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {([1, 2, 3, 4] as const).map(r => (
            <button key={r} className="btn" style={{ minWidth: 80 }} onClick={() => rate(r)}>
              {r === 1 ? (hint ? "Got it" : "1 Again") : r === 2 ? '2 Hard' : r === 3 ? '3 Good' : '4 Easy'}
            </button>
          ))}
          {hint && (
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={() => {
              const current = queue[idx]
              sendMessage({ type: 'REVIEW_TRANSLATION', payload: { id: current.id, rating: 1 } })
              setRatings(prev => ({ ...prev, 1: prev[1] + 1 }))
              if (idx + 1 >= queue.length) { setDone(true) }
              else { setIdx(i => i + 1); setRevealed(false); setHint(null) }
            }}>Got it, next card</button>
          )}
        </div>
      )}
    </div>
  )
}

function BatchImportView({ folders, onDone }: { folders: Folder[]; onDone: () => void }) {
  const [raw, setRaw] = useState('')
  const [sourceLang, setSourceLang] = useState('en')
  const [targetLang, setTargetLang] = useState('vi')
  const [folderId, setFolderId] = useState<string | null>(null)
  const [enrollSRS, setEnrollSRS] = useState(false)
  const [result, setResult] = useState<null | { inserted: number; updated: number; skipped: number; failed: number }>(null)

  const parsed = raw.trim().split('\n').filter(l => l.includes('\t')).length

  const handleImport = async () => {
    const rows = raw
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => {
        const [sourceText = '', translatedText = '', note] = l.split('\t').map(c => c.trim())
        return { sourceText, translatedText, ...(note ? { note } : {}) }
      })
      .filter(r => r.sourceText && r.translatedText)

    const res = await sendMessage<{ inserted: number; updated: number; skipped: number; failed: number }>({
      type: 'BATCH_SAVE_TRANSLATIONS',
      payload: { rows, sourceLang, targetLang, folderId, enrollSRS, duplicateStrategy: 'skip' },
    })
    if (res?.ok && res.data) setResult(res.data)
  }

  if (result) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
      <div style={{ fontSize: 40 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Import Complete</div>
      <div style={{ color: '#5f6368', textAlign: 'center', lineHeight: 2 }}>
        Inserted: {result.inserted} · Updated: {result.updated} · Skipped: {result.skipped} · Failed: {result.failed}
      </div>
      <button className="btn btn-primary" onClick={onDone}>Back to Vault</button>
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
      <h2 style={{ marginBottom: 20 }}>Batch TSV Import</h2>
      <p style={{ color: '#5f6368', marginBottom: 16, fontSize: 12 }}>
        Paste tab-separated rows: <code>source text [TAB] translation [TAB] note (optional)</code>
      </p>
      <textarea
        style={{ width: '100%', minHeight: 200, border: '1px solid #e8eaed', borderRadius: 6, padding: 10, fontFamily: 'monospace', fontSize: 12, marginBottom: 16 }}
        placeholder="hello&#9;xin chào&#10;thank you&#9;cảm ơn"
        value={raw}
        onChange={e => setRaw(e.target.value)}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <label>
          <span style={{ display: 'block', fontSize: 11, color: '#5f6368', marginBottom: 4 }}>Source language</span>
          <input value={sourceLang} onChange={e => setSourceLang(e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e8eaed', borderRadius: 4 }} />
        </label>
        <label>
          <span style={{ display: 'block', fontSize: 11, color: '#5f6368', marginBottom: 4 }}>Target language</span>
          <input value={targetLang} onChange={e => setTargetLang(e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e8eaed', borderRadius: 4 }} />
        </label>
        <label>
          <span style={{ display: 'block', fontSize: 11, color: '#5f6368', marginBottom: 4 }}>Folder</span>
          <select value={folderId ?? ''} onChange={e => setFolderId(e.target.value || null)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e8eaed', borderRadius: 4 }}>
            <option value="">Uncategorized</option>
            {folders.map(f => <option key={f.id} value={f.id}>{'  '.repeat(f.depth)}{f.name}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={enrollSRS} onChange={e => setEnrollSRS(e.target.checked)} />
          <span style={{ fontSize: 12 }}>Enroll in SRS</span>
        </label>
      </div>
      <div style={{ color: '#5f6368', fontSize: 12, marginBottom: 12 }}>{parsed} valid rows detected</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={handleImport} disabled={parsed === 0}>Import {parsed} rows</button>
        <button className="btn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  )
}

function SettingsView({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    sendMessage<Record<string, unknown>>({ type: 'GET_SETTINGS' }).then(r => {
      if (r?.ok && r.data) setSettings(r.data)
    })
  }, [])

  const save = async (patch: Record<string, unknown>) => {
    await sendMessage({ type: 'UPDATE_SETTINGS', payload: patch })
    setSettings(prev => ({ ...prev, ...patch }))
  }

  const testProvider = async () => {
    setTesting(true)
    setTestResult(null)
    const res = await sendMessage({ type: 'TRANSLATE_TEXT', payload: { text: 'hello', sourceLang: 'en', targetLang: 'es' } })
    setTesting(false)
    setTestResult(res?.ok ? { ok: true, message: `OK — "${(res.data as { translatedText?: string })?.translatedText ?? (res.data as Record<string, unknown>)?.translatedText ?? 'done'}"` } : { ok: false, message: res?.error?.message ?? 'Unknown error' })
  }

  if (!settings) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>

  const srs = settings.srs as { enabled: boolean; autoEnrollOnSave: boolean; dailyReviewLimit: number }
  const captureMode = settings.captureMode as string
  const provider = (settings.provider ?? { type: 'mock', apiKey: '', endpoint: '' }) as { type: string; apiKey: string; endpoint: string }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 32, maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2>Settings</h2>
        <button className="btn" onClick={onClose}>Close</button>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Capture</div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <span style={{ width: 120, fontSize: 12 }}>Capture mode</span>
          <select value={captureMode} onChange={e => save({ captureMode: e.target.value })} style={{ padding: '4px 8px', border: '1px solid #e8eaed', borderRadius: 4 }}>
            <option value="manual">Manual</option>
            <option value="auto">Auto</option>
            <option value="off">Off</option>
          </select>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
          <input type="checkbox" checked={settings.showInjectedButtons as boolean} onChange={e => save({ showInjectedButtons: e.target.checked })} />
          Show toolbar on Google Translate
        </label>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Spaced Repetition</div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 12 }}>
          <input type="checkbox" checked={srs.enabled} onChange={e => save({ srs: { ...srs, enabled: e.target.checked } })} />
          Enable SRS review
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 12 }}>
          <input type="checkbox" checked={srs.autoEnrollOnSave} onChange={e => save({ srs: { ...srs, autoEnrollOnSave: e.target.checked } })} />
          Auto-enroll new saves in SRS
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
          <span>Daily review limit</span>
          <input type="number" min={1} max={200} value={srs.dailyReviewLimit} onChange={e => save({ srs: { ...srs, dailyReviewLimit: Number(e.target.value) } })} style={{ width: 60, padding: '4px 6px', border: '1px solid #e8eaed', borderRadius: 4 }} />
        </label>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Translation Provider</div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <span style={{ width: 120, fontSize: 12 }}>Provider</span>
          <select value={provider.type} onChange={e => save({ provider: { ...provider, type: e.target.value } })} style={{ padding: '4px 8px', border: '1px solid #e8eaed', borderRadius: 4 }}>
            <option value="google_translate_web">Google Translate (free, no key)</option>
            <option value="libre_translate">LibreTranslate (free)</option>
            <option value="deepl">DeepL</option>
            <option value="custom_http">Custom HTTP</option>
            <option value="mock">Mock (testing)</option>
          </select>
        </label>
        {(provider.type === 'libre_translate' || provider.type === 'custom_http' || provider.type === 'deepl') && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 12 }}>
            <span style={{ width: 120 }}>Endpoint</span>
            <input
              value={provider.endpoint}
              onChange={e => save({ provider: { ...provider, endpoint: e.target.value } })}
              placeholder={
                provider.type === 'libre_translate' ? 'https://libretranslate.com/translate (optional)' :
                provider.type === 'deepl' ? 'https://api-free.deepl.com/v2/translate (optional)' :
                'https://…'
              }
              style={{ flex: 1, padding: '4px 8px', border: '1px solid #e8eaed', borderRadius: 4 }}
            />
          </label>
        )}
        {(provider.type === 'deepl' || provider.type === 'custom_http') && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 12 }}>
            <span style={{ width: 120 }}>API Key{provider.type === 'deepl' ? ' *' : ''}</span>
            <input
              type="password"
              value={provider.apiKey}
              onChange={e => save({ provider: { ...provider, apiKey: e.target.value } })}
              placeholder={provider.type === 'deepl' ? 'Required' : 'Optional'}
              style={{ flex: 1, padding: '4px 8px', border: '1px solid #e8eaed', borderRadius: 4 }}
            />
          </label>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <button className="btn" onClick={testProvider} disabled={testing}>
            {testing ? 'Testing…' : 'Test Provider'}
          </button>
          {testResult && (
            <span style={{ fontSize: 12, color: testResult.ok ? '#188038' : '#d93025' }}>
              {testResult.message}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function TranslateView({ folders, onDone }: { folders: Folder[]; onDone: () => void }) {
  const [sourceText, setSourceText] = useState('')
  const [sourceLang, setSourceLang] = useState('en')
  const [targetLang, setTargetLang] = useState('vi')
  const [translating, setTranslating] = useState(false)
  const [result, setResult] = useState<Translation | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTranslate = async () => {
    if (!sourceText.trim()) return
    setTranslating(true)
    setError(null)
    setResult(null)
    const res = await sendMessage<Translation>({
      type: 'TRANSLATE_TEXT',
      payload: { text: sourceText.trim(), sourceLang, targetLang },
    })
    setTranslating(false)
    if (res?.ok && res.data) {
      setResult(res.data)
    } else {
      setError(res?.error?.message ?? 'Translation failed')
    }
  }

  const handleMoveFolder = async (folderId: string | null) => {
    if (!result) return
    await sendMessage({ type: 'MOVE_TRANSLATION', payload: { id: result.id, folderId } })
    setResult(prev => prev ? { ...prev, folderId } : null)
  }

  const handleStar = async () => {
    if (!result) return
    await sendMessage({ type: 'STAR_TRANSLATION', payload: result.id })
    setResult(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null)
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 32, maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2>Translate</h2>
        <button className="btn" onClick={onDone}>Back to Vault</button>
      </div>
      <textarea
        style={{ width: '100%', minHeight: 130, border: '1px solid #e8eaed', borderRadius: 6, padding: 10, fontSize: 14, fontFamily: 'inherit', marginBottom: 12, resize: 'vertical', outline: 'none' }}
        placeholder="Enter text to translate…"
        value={sourceText}
        onChange={e => setSourceText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleTranslate() }}
      />
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          From
          <input value={sourceLang} onChange={e => setSourceLang(e.target.value)} style={{ width: 64, padding: '5px 8px', border: '1px solid #e8eaed', borderRadius: 4 }} />
        </label>
        <span style={{ color: '#5f6368', fontSize: 16 }}>→</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          To
          <input value={targetLang} onChange={e => setTargetLang(e.target.value)} style={{ width: 64, padding: '5px 8px', border: '1px solid #e8eaed', borderRadius: 4 }} />
        </label>
        <button
          className="btn btn-primary"
          onClick={handleTranslate}
          disabled={translating || !sourceText.trim()}
          style={{ marginLeft: 'auto', padding: '6px 20px' }}
        >
          {translating ? 'Translating…' : 'Translate'}
        </button>
      </div>
      {error && <div style={{ color: '#d93025', fontSize: 12, marginBottom: 12 }}>{error}</div>}
      {result && (
        <div style={{ border: '1px solid #e8eaed', borderRadius: 8, padding: 20, background: '#f8f9fa' }}>
          {result.usageCount > 1 && (
            <div style={{ fontSize: 11, color: '#b06000', background: '#fef3cd', border: '1px solid #fde68a', borderRadius: 4, padding: '3px 8px', marginBottom: 10 }}>
              Already saved {result.usageCount}×
            </div>
          )}
          <div style={{ fontSize: 11, color: '#1a73e8', fontWeight: 600, marginBottom: 10 }}>
            {((result.sourceLangLabel && result.targetLangLabel) ? `${result.sourceLangLabel} → ${result.targetLangLabel}` : `${(result.sourceLang ?? '?').toUpperCase()} → ${(result.targetLang ?? '?').toUpperCase()}`)}
          </div>
          <div style={{ fontSize: 17, color: '#202124', lineHeight: 1.6, marginBottom: 16, wordBreak: 'break-word' }}>
            {result.translatedText}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <button className="btn" onClick={() => navigator.clipboard.writeText(result.sourceText)}>Copy Original</button>
            <button className="btn" onClick={() => navigator.clipboard.writeText(result.translatedText)}>Copy Translation</button>
            <button className="btn" onClick={handleStar}>
              {result.isStarred ? '★ Starred' : '☆ Star'}
            </button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: '#5f6368' }}>Save to folder</span>
            <select
              value={result.folderId ?? ''}
              onChange={e => handleMoveFolder(e.target.value || null)}
              style={{ padding: '4px 8px', border: '1px solid #e8eaed', borderRadius: 4, fontSize: 12 }}
            >
              <option value="">Uncategorized</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{'  '.repeat(f.depth)}{f.name}</option>
              ))}
            </select>
          </label>
          <div style={{ marginTop: 10, fontSize: 11, color: '#5f6368' }}>
            Saved · {new Date(result.createdAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  )
}

function StatsView({ langPairs, dueCount, learningEnabled }: { langPairs: LangPairCount[], dueCount: number, learningEnabled: boolean }) {
  const [weeklyData, setWeeklyData] = useState<{ label: string, count: number }[]>([])
  const [srsStats, setSrsStats] = useState<{ enrolled: number, due: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      setLoading(true)
      const eightWeeksAgo = startOfWeek(new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000))
      const res = await sendMessage<{ items: Translation[], total: number }>({
        type: 'SEARCH_TRANSLATIONS',
        payload: { createdFrom: eightWeeksAgo, limit: 1000, sortBy: 'createdAt', sortDirection: 'asc' }
      })
      if (res?.ok && res.data) {
        const weeks: Record<number, number> = {}
        for (let i = 0; i < 8; i++) {
          const w = startOfWeek(new Date(eightWeeksAgo + i * 7 * 24 * 60 * 60 * 1000))
          weeks[w] = 0
        }
        res.data.items.forEach(item => {
          const w = startOfWeek(new Date(item.createdAt))
          if (weeks[w] !== undefined) weeks[w]++
        })
        setWeeklyData(Object.entries(weeks).map(([w, count]) => ({
          label: new Date(Number(w)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          count
        })))
      }
      const srsRes = await sendMessage<{ total: number }>({
        type: 'SEARCH_TRANSLATIONS',
        payload: { srsEnabled: true, limit: 1 }
      })
      if (srsRes?.ok && srsRes.data) {
        setSrsStats({ enrolled: srsRes.data.total, due: dueCount })
      }
      setLoading(false)
    }
    loadStats()
  }, [dueCount])

  if (loading) return <div className="list-empty">Loading stats…</div>

  const maxWeekly = Math.max(...weeklyData.map(d => d.count), 1)
  const topPairs = [...langPairs].sort((a, b) => b.count - a.count).slice(0, 10)
  const maxPairs = Math.max(...topPairs.map(p => p.count), 1)

  return (
    <div className="stats-container">
      <h2 style={{ marginBottom: 32 }}>Statistics</h2>
      <section className="stats-section">
        <h3>Saves per week (last 8 weeks)</h3>
        {weeklyData.every(d => d.count === 0) ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No data yet</p>
        ) : (
        <div className="stats-chart-v">
          {weeklyData.map(d => (
            <div key={d.label} className="stats-bar-col">
              <div className="stats-bar-track-v">
                <div className="stats-bar-fill-v" style={{ height: `${(d.count / maxWeekly) * 100}%` }}>
                  {d.count > 0 && <span className="stats-bar-val">{d.count}</span>}
                </div>
              </div>
              <div className="stats-bar-label-v">{d.label}</div>
            </div>
          ))}
        </div>
        )}
      </section>
      <section className="stats-section">
        <h3>Top language pairs</h3>
        {topPairs.length > 0 ? (
          <div className="stats-chart">
            {topPairs.map(p => (
              <div key={`${p.sourceLang}-${p.targetLang}`} className="stats-bar-row">
                <div className="stats-bar-label">{p.sourceLang} → {p.targetLang} ({p.count})</div>
                <div className="stats-bar-track">
                  <div className="stats-bar-fill" style={{ width: `${(p.count / maxPairs) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : <p style={{ color: 'var(--muted)', fontSize: 13 }}>No data yet</p>}
      </section>
      {learningEnabled && srsStats && (
        <section className="stats-section">
          <h3>SRS retention</h3>
          {srsStats.enrolled > 0 ? (
            <div className="stats-bar-row">
              <div className="stats-bar-label">
                {srsStats.enrolled - srsStats.due} retained / {srsStats.enrolled} enrolled 
                ({Math.round(((srsStats.enrolled - srsStats.due) / srsStats.enrolled) * 100)}%)
              </div>
              <div className="stats-bar-track">
                <div className="stats-bar-fill" style={{ width: `${((srsStats.enrolled - srsStats.due) / srsStats.enrolled) * 100}%` }} />
              </div>
            </div>
          ) : <p style={{ color: 'var(--muted)', fontSize: 13 }}>No items enrolled in SRS yet</p>}
        </section>
      )}
    </div>
  )
}

function PhrasebookView() {
  const [phrasebooks, setPhrasebooks] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')

  const loadPhrasebooks = useCallback(async () => {
    setLoading(true)
    const res = await sendMessage<any[]>({ type: 'GET_PHRASEBOOKS' })
    if (res?.ok && res.data) setPhrasebooks(res.data)
    setLoading(false)
  }, [])

  const loadItems = useCallback(async (id: string) => {
    setLoadingItems(true)
    const res = await sendMessage<any[]>({ type: 'GET_PHRASEBOOK_ITEMS', payload: { phrasebookId: id } })
    if (res?.ok && res.data) {
      const enriched = await Promise.all(res.data.map(async item => {
        const tRes = await sendMessage<Translation>({ type: 'GET_TRANSLATION', payload: item.translationId })
        return { ...item, translation: tRes?.ok ? tRes.data : null }
      }))
      setItems(enriched)
    }
    setLoadingItems(false)
  }, [])

  useEffect(() => {
    loadPhrasebooks()
  }, [loadPhrasebooks])

  useEffect(() => {
    if (selectedId) loadItems(selectedId)
    else setItems([])
  }, [selectedId, loadItems])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const res = await sendMessage({ type: 'CREATE_PHRASEBOOK', payload: { name: newName.trim() } })
    if (res?.ok) {
      setNewName('')
      setShowNewForm(false)
      loadPhrasebooks()
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete phrasebook "${name}"? Items will not be deleted from vault.`)) return
    await sendMessage({ type: 'DELETE_PHRASEBOOK', payload: { id } })
    if (selectedId === id) setSelectedId(null)
    loadPhrasebooks()
  }

  const handleRemoveItem = async (translationId: string) => {
    if (!selectedId) return
    await sendMessage({ type: 'REMOVE_FROM_PHRASEBOOK', payload: { phrasebookId: selectedId, translationId } })
    loadItems(selectedId)
  }

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ width: 260, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: .5 }}>My Phrasebooks</h3>
          <button className="btn-icon" onClick={() => setShowNewForm(true)} title="New phrasebook">+</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {showNewForm && (
            <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
              <input
                autoFocus
                style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--blue)', borderRadius: 4, fontSize: 13, marginBottom: 8, outline: 'none' }}
                placeholder="Name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNewForm(false) }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={handleCreate}>Create</button>
                <button className="btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setShowNewForm(false)}>Cancel</button>
              </div>
            </div>
          )}
          {loading && <div style={{ padding: 20, fontSize: 12, color: 'var(--muted)' }}>Loading…</div>}
          {!loading && phrasebooks.length === 0 && <div style={{ padding: 20, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No phrasebooks created</div>}
          {phrasebooks.map(pb => (
            <div
              key={pb.id}
              onClick={() => setSelectedId(pb.id)}
              style={{
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: selectedId === pb.id ? 'var(--blue-light)' : 'transparent',
                color: selectedId === pb.id ? 'var(--blue)' : 'inherit',
                fontWeight: selectedId === pb.id ? 600 : 400
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📚 {pb.name}</span>
              <button
                className="btn-icon"
                style={{ opacity: selectedId === pb.id ? 1 : 0, fontSize: 14 }}
                onClick={e => { e.stopPropagation(); handleDelete(pb.id, pb.name) }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: '#fff', padding: 32 }}>
        {!selectedId ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
            <p>Select a phrasebook to view its items</p>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, marginBottom: 4 }}>{phrasebooks.find(p => p.id === selectedId)?.name}</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>{items.length} items in this collection</p>
            </div>
            {loadingItems ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading items…</div>
            ) : items.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13, fontStyle: 'italic', marginTop: 40, textAlign: 'center' }}>
                This phrasebook is empty. Add translations from the Vault.
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px 20px',
                      borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 20
                    }}
                  >
                    <div style={{ width: 30, color: 'var(--muted)', fontSize: 11, fontWeight: 600 }}>{idx + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.translation?.sourceText || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--blue)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.translation?.translatedText || 'Unknown'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                       <button className="btn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => handleRemoveItem(item.translationId)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
