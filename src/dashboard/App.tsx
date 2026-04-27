import { useState, useEffect, useCallback, useRef } from 'react'
import { SidebarSmartCollections } from './components/SidebarSmartCollections'
import { SidebarFolderTree } from './components/SidebarFolderTree'
import { TranslationList } from './components/TranslationList'
import { TranslationDetail } from './components/TranslationDetail'
import { sendMessage } from '../shared/services/messagingService'
import type { Translation, SearchTranslationsQuery, LangPairCount } from '../shared/types/translation'
import type { Folder, FolderId } from '../shared/types/folder'
import type { Tag } from '../shared/types/tag'
import type { SmartCollection } from '../shared/types/smartCollection'

type View = 'list' | 'review' | 'batch_import' | 'import_export' | 'settings'

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
  const [tagsMap, setTagsMap] = useState<Map<string, Tag[]>>(new Map())
  const [dueCount, setDueCount] = useState(0)
  const [langPairs, setLangPairs] = useState<LangPairCount[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sidebarKey, setSidebarKey] = useState<string>('all')
  const [activeQuery, setActiveQuery] = useState<SearchTranslationsQuery>({
    sortBy: 'lastUsedAt',
    sortDirection: 'desc',
    limit: PAGE_SIZE,
  })
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const selectedItem = items.find(t => t.id === selectedId) ?? null

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
    const [fRes, lpRes, dcRes, fcRes] = await Promise.all([
      sendMessage<Folder[]>({ type: 'GET_FOLDER_TREE' }),
      sendMessage<LangPairCount[]>({ type: 'GET_LANG_PAIRS' }),
      sendMessage<number>({ type: 'GET_DUE_COUNT' }),
      sendMessage<Record<string, number>>({ type: 'GET_FOLDER_COUNTS' }),
    ])
    if (fRes?.ok && fRes.data) setFolders(fRes.data)
    if (lpRes?.ok && lpRes.data) setLangPairs(lpRes.data)
    if (dcRes?.ok) setDueCount(dcRes.data as number ?? 0)
    if (fcRes?.ok && fcRes.data) setFolderCounts(fcRes.data)
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
    setSidebarKey(c.id)
    setSelectedId(null)
    setSelectedIds(new Set())
    setOffset(0)
    const q: SearchTranslationsQuery = { ...c.query, q: query || undefined, limit: PAGE_SIZE, offset: 0 }
    setActiveQuery(q)
    loadTranslations(q)
  }

  const selectLangPair = (sourceLang: string, targetLang: string) => {
    const key = `lp_${sourceLang}_${targetLang}`
    setSidebarKey(key)
    setSelectedId(null)
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

  const selectFolder = (id: FolderId) => {
    setSidebarKey(`folder_${id}`)
    setSelectedId(null)
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
  }

  const handleUpdated = (updated: Translation) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
  }

  const handleDeleted = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    setTotal(t => t - 1)
    setSelectedId(null)
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
    if (!confirm(`Delete ${selectedIds.size} translation(s)?`)) return
    for (const id of selectedIds) {
      await sendMessage({ type: 'DELETE_TRANSLATION', payload: id })
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
        const res = await sendMessage({
          type: 'IMPORT_DATA',
          payload: { data, options: { mergeStrategy: 'merge', duplicateStrategy: 'skip' } },
        })
        if (res?.ok) {
          alert(`Import complete: ${JSON.stringify(res.data)}`)
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
          {dueCount > 0 && (
            <button className="btn" onClick={() => setView('review')} style={{ color: '#1a73e8' }}>
              🔁 Review ({dueCount})
            </button>
          )}
          <button className="btn" onClick={() => setView('batch_import')}>+ Batch Import</button>
          <button className="btn" onClick={() => handleExport('json')}>Export JSON</button>
          <button className="btn" onClick={() => handleExport('anki_tsv')}>Export Anki</button>
          <button className="btn" onClick={() => handleExport('markdown')}>Export MD</button>
          <button className="btn" onClick={handleImportJSON}>Import JSON</button>
          <button className="btn-icon" title="Settings" onClick={() => setView('settings')}>⚙</button>
        </div>
      </div>

      <div className="body-area">
        {/* Sidebar */}
        <div className="sidebar">
          <SidebarSmartCollections
            selected={sidebarKey}
            dueCount={dueCount}
            langPairs={langPairs}
            onSelectCollection={selectCollection}
            onSelectLangPair={selectLangPair}
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
            <ReviewView dueCount={dueCount} onExit={() => { setView('list'); loadSidebar() }} />
          )}
          {view === 'batch_import' && (
            <BatchImportView folders={folders} onDone={() => { setView('list'); loadTranslations(activeQuery); loadSidebar() }} />
          )}
          {view === 'settings' && (
            <SettingsView onClose={() => setView('list')} />
          )}
          {view === 'list' && (
            <>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {selectedIds.size > 0 && (
                  <div className="bulk-bar">
                    <span>{selectedIds.size} selected</span>
                    <button className="bulk-btn" onClick={handleBulkStar}>★ Star all</button>
                    <button className="bulk-btn" onClick={handleBulkDelete}>🗑 Delete all</button>
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
                  onSelect={t => setSelectedId(t.id)}
                  onToggleSelect={handleToggleSelect}
                  onStar={handleStar}
                  onLoadMore={handleLoadMore}
                  hasMore={items.length < total}
                />
              </div>
              {selectedItem && (
                <TranslationDetail
                  item={selectedItem}
                  folders={folders}
                  onClose={() => setSelectedId(null)}
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

// ── Inline sub-views (M7, M8, M10) ─────────────────────────────────────────

function ReviewView({ dueCount, onExit }: { dueCount: number; onExit: () => void }) {
  const [queue, setQueue] = useState<Translation[]>([])
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)
  const [ratings, setRatings] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 })
  const [started, setStarted] = useState(false)

  const start = async () => {
    const res = await sendMessage<Translation[]>({ type: 'GET_DUE_REVIEWS' })
    if (res?.ok && res.data) { setQueue(res.data); setStarted(true) }
  }

  const rate = async (rating: 1 | 2 | 3 | 4) => {
    const current = queue[idx]
    await sendMessage({ type: 'REVIEW_TRANSLATION', payload: { id: current.id, rating } })
    setRatings(prev => ({ ...prev, [rating]: prev[rating] + 1 }))
    if (idx + 1 >= queue.length) { setDone(true) }
    else { setIdx(i => i + 1); setRevealed(false) }
  }

  if (!started) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 40 }}>🔁</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{dueCount} cards due for review</div>
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
          {(card.sourceLang ?? '?').toUpperCase()} → {(card.targetLang ?? '?').toUpperCase()}
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, marginBottom: revealed ? 24 : 0 }}>{card.sourceText}</div>
        {revealed && (
          <div style={{ borderTop: '1px solid #e8eaed', marginTop: 16, paddingTop: 16, fontSize: 20, color: '#1a73e8', fontWeight: 500 }}>
            {card.translatedText}
          </div>
        )}
      </div>
      {!revealed ? (
        <button className="btn btn-primary" onClick={() => setRevealed(true)}>Reveal Translation</button>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          {([1, 2, 3, 4] as const).map(r => (
            <button key={r} className="btn" style={{ minWidth: 80 }} onClick={() => rate(r)}>
              {r === 1 ? "1 Didn't know" : r === 2 ? '2 Hard' : r === 3 ? '3 Good' : '4 Easy'}
            </button>
          ))}
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

  useEffect(() => {
    sendMessage<Record<string, unknown>>({ type: 'GET_SETTINGS' }).then(r => {
      if (r?.ok && r.data) setSettings(r.data)
    })
  }, [])

  const save = async (patch: Record<string, unknown>) => {
    await sendMessage({ type: 'UPDATE_SETTINGS', payload: patch })
    setSettings(prev => ({ ...prev, ...patch }))
  }

  if (!settings) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>

  const srs = settings.srs as { enabled: boolean; autoEnrollOnSave: boolean; dailyReviewLimit: number }
  const captureMode = settings.captureMode as string

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
    </div>
  )
}
