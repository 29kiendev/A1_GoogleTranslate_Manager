import { useState, useEffect, useCallback, useRef } from 'react'
import { SearchBox } from './components/SearchBox'
import { TranslationCard } from './components/TranslationCard'
import { FolderSelect } from './components/FolderSelect'
import { sendMessage } from '../shared/services/messagingService'
import type { Translation } from '../shared/types/translation'
import type { Folder } from '../shared/types/folder'
import type { AppSettings } from '../shared/types/settings'

const LANGUAGES = [
  { code: 'af', name: 'Afrikaans' },
  { code: 'sq', name: 'Albanian' },
  { code: 'am', name: 'Amharic' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hy', name: 'Armenian' },
  { code: 'az', name: 'Azerbaijani' },
  { code: 'eu', name: 'Basque' },
  { code: 'be', name: 'Belarusian' },
  { code: 'bn', name: 'Bengali' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'ca', name: 'Catalan' },
  { code: 'ceb', name: 'Cebuano' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'co', name: 'Corsican' },
  { code: 'hr', name: 'Croatian' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'en', name: 'English' },
  { code: 'eo', name: 'Esperanto' },
  { code: 'et', name: 'Estonian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'fy', name: 'Frisian' },
  { code: 'gl', name: 'Galician' },
  { code: 'ka', name: 'Georgian' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'ht', name: 'Haitian Creole' },
  { code: 'ha', name: 'Hausa' },
  { code: 'haw', name: 'Hawaiian' },
  { code: 'iw', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hmn', name: 'Hmong' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'ig', name: 'Igbo' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ga', name: 'Irish' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'jw', name: 'Javanese' },
  { code: 'kn', name: 'Kannada' },
  { code: 'kk', name: 'Kazakh' },
  { code: 'km', name: 'Khmer' },
  { code: 'rw', name: 'Kinyarwanda' },
  { code: 'ko', name: 'Korean' },
  { code: 'ku', name: 'Kurdish' },
  { code: 'ky', name: 'Kyrgyz' },
  { code: 'lo', name: 'Lao' },
  { code: 'la', name: 'Latin' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'lb', name: 'Luxembourgish' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'mg', name: 'Malagasy' },
  { code: 'ms', name: 'Malay' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mt', name: 'Maltese' },
  { code: 'mi', name: 'Maori' },
  { code: 'mr', name: 'Marathi' },
  { code: 'mn', name: 'Mongolian' },
  { code: 'my', name: 'Myanmar (Burmese)' },
  { code: 'ne', name: 'Nepali' },
  { code: 'no', name: 'Norwegian' },
  { code: 'ny', name: 'Nyanja (Chichewa)' },
  { code: 'or', name: 'Odia (Oriya)' },
  { code: 'ps', name: 'Pashto' },
  { code: 'fa', name: 'Persian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sm', name: 'Samoan' },
  { code: 'gd', name: 'Scots Gaelic' },
  { code: 'sr', name: 'Serbian' },
  { code: 'st', name: 'Sesotho' },
  { code: 'sn', name: 'Shona' },
  { code: 'sd', name: 'Sindhi' },
  { code: 'si', name: 'Sinhala (Sinhalese)' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'so', name: 'Somali' },
  { code: 'es', name: 'Spanish' },
  { code: 'su', name: 'Sundanese' },
  { code: 'sw', name: 'Swahili' },
  { code: 'sv', name: 'Swedish' },
  { code: 'tl', name: 'Tagalog (Filipino)' },
  { code: 'tg', name: 'Tajik' },
  { code: 'ta', name: 'Tamil' },
  { code: 'tt', name: 'Tatar' },
  { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'tk', name: 'Turkmen' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'ug', name: 'Uyghur' },
  { code: 'uz', name: 'Uzbek' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'cy', name: 'Welsh' },
  { code: 'xh', name: 'Xhosa' },
  { code: 'yi', name: 'Yiddish' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'zu', name: 'Zulu' },
]

const langName = (code: string) => LANGUAGES.find(l => l.code === code)?.name ?? code

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
  const [tab, setTab] = useState<'translate' | 'history' | 'review'>('translate')

  // Translate tab state
  const [sourceText, setSourceText] = useState('')
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('vi')
  const [translating, setTranslating] = useState(false)
  const [translateResult, setTranslateResult] = useState<Translation | null>(null)
  const [translateError, setTranslateError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [recentPairs, setRecentPairs] = useState<{ sourceLang: string; targetLang: string }[]>([])

  // History tab state
  const [query, setQuery] = useState('')
  const [folderFilter, setFolderFilter] = useState<string | null>(null)
  const [starFilter, setStarFilter] = useState(false)
  const [items, setItems] = useState<Translation[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [dueCount, setDueCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [moveTarget, setMoveTarget] = useState<Translation | null>(null)
  const [maskContent, setMaskContent] = useState(false)
  const [contentRevealed, setContentRevealed] = useState(false)
  const [debounceMs, setDebounceMs] = useState(300)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [fontScale, setFontScale] = useState(1.0)
  const [historyView, setHistoryView] = useState<'list' | 'tree'>('list')
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})
  const [learningEnabled, setLearningEnabled] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const translateRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Review tab state
  const [reviewQueue, setReviewQueue] = useState<Translation[]>([])
  const [reviewIdx, setReviewIdx] = useState(0)
  const [reviewRevealed, setReviewRevealed] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [loadingHint, setLoadingHint] = useState(false)

  const load = useCallback(async (q: string, folderId: string | null, starred: boolean, view: 'list' | 'tree') => {
    setLoading(true)
    const res = q || folderId || starred || view === 'tree'
      ? await sendMessage<{ items: Translation[]; total: number }>({
          type: 'SEARCH_TRANSLATIONS',
          payload: {
            q: q || undefined,
            folderId: folderId ?? undefined,
            isStarred: starred || undefined,
            limit: view === 'tree' ? 200 : 30,
            sortBy: 'lastUsedAt',
            sortDirection: 'desc',
          },
        })
      : await sendMessage<Translation[]>({ type: 'GET_RECENT_TRANSLATIONS' })

    if (res?.ok) {
      setItems(Array.isArray(res.data) ? res.data : (res.data as { items: Translation[] })?.items ?? [])
      setSelectedIndex(-1)
    }
    setLoading(false)
  }, [])

  const loadReviewQueue = async () => {
    setReviewLoading(true)
    const res = await sendMessage<Translation[]>({ type: 'GET_DUE_REVIEWS' })
    if (res?.ok && res.data) {
      setReviewQueue(res.data)
      setReviewIdx(0)
      setReviewRevealed(false)
      setHint(null)
    }
    setReviewLoading(false)
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const source = urlParams.get('source')

    sendMessage<AppSettings>({ type: 'GET_SETTINGS' }).then(r => {
      if (r?.ok && r.data) {
        if (source === 'fab' || source === 'pinned') {
          setTab('translate')
        } else {
          setTab(r.data.popupDefaultView === 'translate' ? 'translate' : 'history')
        }
        setMaskContent(r.data.privacyMode.maskPopupContent)
        setDebounceMs(r.data.searchDebounceMs)
        setFontScale(r.data.uiPreferences?.translateFontScale ?? 1.0)
        setRecentPairs(r.data.uiPreferences?.recentLanguagePairs ?? [])
        setLearningEnabled(r.data.learningMode?.enabled ?? true)
      }
    })
    sendMessage<Folder[]>({ type: 'GET_FOLDER_TREE' }).then(r => {
      if (r?.ok && r.data) setFolders(r.data)
    })
    sendMessage<number>({ type: 'GET_DUE_COUNT' }).then(r => {
      if (r?.ok && r.data !== undefined) setDueCount(r.data as number)
    })
  }, [load])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(query, folderFilter, starFilter, historyView), debounceMs)
    return () => clearTimeout(debounceRef.current)
  }, [query, folderFilter, starFilter, load, debounceMs, historyView])

  const handleTranslate = async (overrideText?: string) => {
    const text = (overrideText ?? sourceText).trim()
    if (!text) return
    setTranslating(true)
    setTranslateError(null)
    setTranslateResult(null)
    const res = await sendMessage<Translation>({
      type: 'TRANSLATE_TEXT',
      payload: { text, sourceLang, targetLang },
    })
    setTranslating(false)
    if (res?.ok && res.data) {
      setTranslateResult(res.data)
      updateRecentPairs(sourceLang, targetLang)
    } else {
      setTranslateError(res?.error?.message ?? 'Translation failed')
    }
  }

  const updateRecentPairs = async (sl: string, tl: string) => {
    const r = await sendMessage<AppSettings>({ type: 'GET_SETTINGS' })
    if (r?.ok && r.data) {
      const current = r.data.uiPreferences?.recentLanguagePairs ?? []
      const next = [{ sourceLang: sl, targetLang: tl }, ...current.filter(p => !(p.sourceLang === sl && p.targetLang === tl))].slice(0, 3)
      setRecentPairs(next)
      sendMessage({ type: 'UPDATE_SETTINGS', payload: { uiPreferences: { ...r.data.uiPreferences, recentLanguagePairs: next } } })
    }
  }

  const adjustFont = (delta: number) => {
    const next = Math.min(2.0, Math.max(0.75, fontScale + delta))
    setFontScale(next)
    sendMessage<AppSettings>({ type: 'GET_SETTINGS' }).then(r => {
      if (r?.ok && r.data) {
        sendMessage({ type: 'UPDATE_SETTINGS', payload: { uiPreferences: { ...r.data.uiPreferences, translateFontScale: next } } })
      }
    })
  }

  useEffect(() => {
    if (tab !== 'translate' || !translateResult) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && document.getSelection()?.toString() === '') {
        e.preventDefault()
        copyText(translateResult.translatedText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tab, translateResult])

  useEffect(() => {
    clearTimeout(translateRef.current)
    if (!sourceText.trim()) {
      setTranslateResult(null)
      setTranslateError(null)
      return
    }
    translateRef.current = setTimeout(() => handleTranslate(), 600)
    return () => clearTimeout(translateRef.current)
  }, [sourceText, sourceLang, targetLang]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSwap = () => {
    const effectiveSource = sourceLang === 'auto'
      ? (translateResult?.sourceLang ?? null)
      : sourceLang
    if (!effectiveSource) return
    setSourceLang(targetLang)
    setTargetLang(effectiveSource)
    if (translateResult) {
      setSourceText(translateResult.translatedText)
      setTranslateResult(null)
    }
  }

  const handleCopyResult = () => {
    if (!translateResult) return
    copyText(translateResult.translatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleResultStar = async () => {
    if (!translateResult) return
    await sendMessage({ type: 'STAR_TRANSLATION', payload: translateResult.id })
    setTranslateResult(prev => prev ? { ...prev, isStarred: !prev.isStarred } : prev)
  }

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

  const handleRate = async (rating: 1 | 2 | 3 | 4) => {
    const current = reviewQueue[reviewIdx]

    if (rating === 1 && !hint) {
      setLoadingHint(true)
      const res = await sendMessage<string>({
        type: 'GET_USAGE_HINT',
        payload: {
          text: current.sourceText,
          sourceLang: current.sourceLang || 'auto',
          targetLang: current.targetLang || 'en',
        },
      })
      setLoadingHint(false)
      if (res?.ok && res.data) {
        setHint(res.data)
        return
      }
    }

    await sendMessage({ type: 'REVIEW_TRANSLATION', payload: { id: current.id, rating } })
    if (reviewIdx + 1 >= reviewQueue.length) {
      setReviewQueue([])
      const res = await sendMessage<number>({ type: 'GET_DUE_COUNT' })
      if (res?.ok && res.data !== undefined) setDueCount(res.data as number)
    } else {
      setReviewIdx(i => i + 1)
      setReviewRevealed(false)
      setHint(null)
    }
  }

  useEffect(() => {
    if (tab !== 'history' || moveTarget) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        copyText(items[selectedIndex].translatedText)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tab, moveTarget, items, selectedIndex])

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') })
  }

  const handlePin = () => {
    const isEmbedded = window.self !== window.top
    if (isEmbedded) {
      // Running inside FAB iframe — ask content-fab to detach us
      sendMessage({ type: 'DETACH_FAB_POPUP' })
    } else {
      chrome.windows.create({
        url: chrome.runtime.getURL('popup.html') + '?source=pinned',
        type: 'popup',
        width: 420,
        height: 560,
      })
      window.close()
    }
  }

  const switchToReview = () => {
    setTab('review')
    if (reviewQueue.length === 0) loadReviewQueue()
  }

  return (
    <div className="popup-root">
      {/* GT-style white header */}
      <header className="gt-header">
        <div className="gt-logo">
          <span className="gt-logo-g">
            <span style={{ color: '#4285f4' }}>G</span>
            <span style={{ color: '#ea4335' }}>o</span>
            <span style={{ color: '#fbbc04' }}>o</span>
            <span style={{ color: '#4285f4' }}>g</span>
            <span style={{ color: '#34a853' }}>l</span>
            <span style={{ color: '#ea4335' }}>e</span>
          </span>
          &nbsp;Translate
        </div>
        <div className="gt-header-right">
          {learningEnabled && dueCount > 0 && (
            <span className="gt-due-badge" onClick={switchToReview} title="Cards due for review">
              {dueCount} due
            </span>
          )}
          <button className="gt-pin-btn" onClick={handlePin} title="Pin to window">📌</button>
          <button className="gt-vault-btn" onClick={openDashboard}>Vault</button>
        </div>
      </header>

      {/* Main content */}
      <div className="gt-content">
        {tab === 'translate' && (
          <div className="gt-translate-view">
            {/* Quick language pins */}
            {recentPairs.length > 0 && (
              <div className="gt-lang-pins">
                {recentPairs.map(p => (
                  <button
                    key={`${p.sourceLang}-${p.targetLang}`}
                    className="gt-lang-pin-chip"
                    onClick={() => {
                      setSourceLang(p.sourceLang)
                      setTargetLang(p.targetLang)
                      setTranslateResult(null)
                    }}
                  >
                    {langName(p.sourceLang)} → {langName(p.targetLang)}
                  </button>
                ))}
              </div>
            )}

            {/* Language bar */}
            <div className="gt-lang-bar">
              <select
                className="gt-lang-select"
                value={sourceLang}
                onChange={e => { setSourceLang(e.target.value); setTranslateResult(null) }}
              >
                <option value="auto">Detect language</option>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
              <button
                className="gt-swap-btn"
                onClick={handleSwap}
                disabled={sourceLang === 'auto' && !translateResult}
                title="Swap languages"
              >
                ⇄
              </button>
              <select
                className="gt-lang-select"
                value={targetLang}
                onChange={e => { setTargetLang(e.target.value); setTranslateResult(null) }}
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>

            {sourceLang === 'auto' && translateResult && (
              <div style={{ padding: '4px 12px', fontSize: 11, color: '#5f6368', background: '#f8f9fa', borderBottom: '1px solid #e8eaed' }}>
                Detected: <strong>{translateResult.sourceLangLabel ?? translateResult.sourceLang ?? '?'}</strong>
              </div>
            )}

            {/* Source panel */}
            <div className="gt-source-panel">
              <textarea
                className="gt-source-textarea"
                placeholder="Enter text"
                value={sourceText}
                maxLength={5000}
                style={{ fontSize: `${fontScale * 18}px` }}
                onChange={e => { setSourceText(e.target.value); setTranslateResult(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleTranslate() }}
                onPaste={e => {
                  const pasted = e.clipboardData.getData('text')
                  if (pasted.trim()) {
                    setSourceText(pasted)
                    setTranslateResult(null)
                  }
                }}
                autoFocus
              />
              <div className="gt-source-footer">
                {sourceText ? (
                  <button
                    className="gt-clear-btn"
                    onClick={() => { setSourceText(''); setTranslateResult(null); setTranslateError(null) }}
                    title="Clear"
                  >
                    ✕
                  </button>
                ) : <span style={{ width: 28 }} />}
                <div className="gt-zoom-controls">
                  <button className="gt-zoom-btn" onClick={() => adjustFont(-0.1)} title="Zoom out">−</button>
                  <button className="gt-zoom-btn" onClick={() => adjustFont(0.1)} title="Zoom in">+</button>
                </div>
                <span className="gt-char-count">{sourceText.length} / 5000</span>
                {sourceText && translateResult && (
                  <button className="gt-retranslate-btn" onClick={() => handleTranslate()} title="Re-translate">↻</button>
                )}
              </div>
            </div>

            {translateError && (
              <div className="gt-error">{translateError}</div>
            )}

            {/* Result panel */}
            {(translateResult || translating) && (
              <div className="gt-result-panel">
                {translating ? (
                  <div className="gt-result-loading">Translating…</div>
                ) : translateResult && (
                  <>
                    {translateResult.usageCount > 1 && (
                      <div className="gt-duplicate-notice">Saved {translateResult.usageCount}×</div>
                    )}
                    <div className="gt-result-text" style={{ fontSize: `${fontScale * 18}px` }}>{translateResult.translatedText}</div>
                    <div className="gt-result-footer">
                      <button className="gt-action-btn" onClick={handleCopyResult} title={copied ? 'Copied!' : 'Copy translation'}>
                        {copied ? (
                          <svg width="20" height="20" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="#1a73e8"/></svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/></svg>
                        )}
                      </button>
                      <button
                        className="gt-action-btn"
                        onClick={handleResultStar}
                        title={translateResult.isStarred ? 'Remove star' : 'Star'}
                      >
                        {translateResult.isStarred
                          ? <svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="#f9ab00"/></svg>
                          : <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z" fill="currentColor"/></svg>
                        }
                      </button>
                      <a
                        href={`https://translate.google.com/?sl=${sourceLang === 'auto' ? 'auto' : sourceLang}&tl=${targetLang}&text=${encodeURIComponent(sourceText)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="gt-open-gt-btn"
                        title="Open in Google Translate"
                      >
                        Open in GT
                      </a>
                      <select
                        className="gt-result-folder-select"
                        value={translateResult.folderId ?? ''}
                        onChange={async e => {
                          const folderId = e.target.value || null
                          await sendMessage({ type: 'MOVE_TRANSLATION', payload: { id: translateResult.id, folderId } })
                          setTranslateResult({ ...translateResult, folderId })
                        }}
                      >
                        <option value="">None (root)</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <>
            <div className="popup-controls">
              <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <SearchBox value={query} onChange={setQuery} />
                <div className="history-view-toggle">
                  <button
                    className={`view-toggle-btn${historyView === 'list' ? ' active' : ''}`}
                    onClick={() => setHistoryView('list')}
                    title="List view"
                  >
                    List
                  </button>
                  <button
                    className={`view-toggle-btn${historyView === 'tree' ? ' active' : ''}`}
                    onClick={() => setHistoryView('tree')}
                    title="Tree view"
                  >
                    Tree
                  </button>
                </div>
              </div>
              <div className="filter-row">
                <FolderSelect folders={folders} value={folderFilter} onChange={setFolderFilter} />
                <button
                  className={`star-filter${starFilter ? ' active' : ''}`}
                  onClick={() => setStarFilter(v => !v)}
                  title="Starred only"
                >
                  ★
                </button>
                {maskContent && (
                  <button
                    className={`star-filter${contentRevealed ? ' active' : ''}`}
                    onClick={() => setContentRevealed(v => !v)}
                    title={contentRevealed ? 'Hide content' : 'Reveal content'}
                  >
                    {contentRevealed ? '👁️' : '🙈'}
                  </button>
                )}
              </div>
            </div>

            <div className={`popup-list${maskContent && !contentRevealed ? ' masked' : ''}`}>
              {loading && <div className="empty-state">Loading…</div>}
              {!loading && items.length === 0 && (
                <div className="empty-state">No translations found</div>
              )}
              {!loading && historyView === 'list' && items.map((item, idx) => (
                <TranslationCard
                  key={item.id}
                  item={item}
                  selected={selectedIndex === idx}
                  onCopyOriginal={t => copyText(t.sourceText)}
                  onCopyTranslation={t => copyText(t.translatedText)}
                  onCopyBoth={t => copyText(`Original: ${t.sourceText}\nTranslation: ${t.translatedText}`)}
                  onStar={handleStar}
                  onMove={t => setMoveTarget(t)}
                />
              ))}

              {!loading && historyView === 'tree' && items.length > 0 && (
                <div className="history-tree">
                  {folders.map(folder => {
                    const folderItems = items.filter(i => i.folderId === folder.id)
                    if (folderItems.length === 0 && folder.parentId !== null) return null // Hide empty subfolders
                    
                    return (
                      <div key={folder.id} className="tree-folder">
                        <div 
                          className="tree-folder-header"
                          onClick={() => setCollapsedFolders(prev => ({ ...prev, [folder.id]: !prev[folder.id] }))}
                        >
                          <span className="tree-folder-icon">{collapsedFolders[folder.id] ? '▶' : '▼'}</span>
                          <span className="tree-folder-icon">📁</span>
                          <span className="tree-folder-text">{folder.name}</span>
                          <span className="tree-folder-count">({folderItems.length})</span>
                        </div>
                        {!collapsedFolders[folder.id] && (
                          <div className="tree-folder-content">
                            {folderItems.map(item => (
                              <div key={item.id} className="tree-item" onClick={() => copyText(item.translatedText)}>
                                <div className="tree-item-text">
                                  {item.sourceText} <span>→</span> {item.translatedText}
                                </div>
                                <div className="tree-item-actions">
                                  <button 
                                    className={`tree-action-btn${item.isStarred ? ' starred' : ''}`}
                                    onClick={e => { e.stopPropagation(); handleStar(item) }}
                                  >
                                    ★
                                  </button>
                                  <button className="tree-action-btn" onClick={e => { e.stopPropagation(); copyText(item.translatedText) }}>
                                    📋
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {/* Unsorted items */}
                  {items.filter(i => i.folderId === null).length > 0 && (
                    <div className="tree-folder">
                      <div 
                        className="tree-folder-header"
                        onClick={() => setCollapsedFolders(prev => ({ ...prev, unsorted: !prev.unsorted }))}
                      >
                        <span className="tree-folder-icon">{collapsedFolders.unsorted ? '▶' : '▼'}</span>
                        <span className="tree-folder-icon">📄</span>
                        <span className="tree-folder-text">Unsorted</span>
                        <span className="tree-folder-count">({items.filter(i => i.folderId === null).length})</span>
                      </div>
                      {!collapsedFolders.unsorted && (
                        <div className="tree-folder-content">
                          {items.filter(i => i.folderId === null).map(item => (
                            <div key={item.id} className="tree-item" onClick={() => copyText(item.translatedText)}>
                              <div className="tree-item-text">
                                {item.sourceText} <span>→</span> {item.translatedText}
                              </div>
                              <div className="tree-item-actions">
                                <button 
                                  className={`tree-action-btn${item.isStarred ? ' starred' : ''}`}
                                  onClick={e => { e.stopPropagation(); handleStar(item) }}
                                >
                                  ★
                                </button>
                                <button className="tree-action-btn" onClick={e => { e.stopPropagation(); copyText(item.translatedText) }}>
                                  📋
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
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
          </>
        )}

        {tab === 'review' && (
          <div className="review-tab">
            {reviewLoading ? (
              <div className="empty-state">Loading cards…</div>
            ) : reviewQueue.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 600 }}>All caught up!</div>
                <p style={{ color: '#5f6368', marginTop: 4 }}>No cards due for review.</p>
                <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setTab('translate')}>Back to Translate</button>
              </div>
            ) : (
              <div className="review-container">
                <div className="review-progress">{reviewIdx + 1} / {reviewQueue.length}</div>
                <div className="review-card">
                  <div className="card-lang-header">
                    {reviewQueue[reviewIdx].sourceLangLabel && reviewQueue[reviewIdx].targetLangLabel
                      ? `${reviewQueue[reviewIdx].sourceLangLabel} → ${reviewQueue[reviewIdx].targetLangLabel}`
                      : `${(reviewQueue[reviewIdx].sourceLang ?? '?').toUpperCase()} → ${(reviewQueue[reviewIdx].targetLang ?? '?').toUpperCase()}`
                    }
                  </div>
                  <div className="card-source-text">{reviewQueue[reviewIdx].sourceText}</div>
                  {reviewRevealed && (
                    <div className="card-translated-text">{reviewQueue[reviewIdx].translatedText}</div>
                  )}
                  {hint && <div className="card-hint">💡 {hint}</div>}
                  {loadingHint && <div className="card-loading-hint">Fetching hint…</div>}
                </div>
                {!reviewRevealed ? (
                  <button className="btn-primary flip-btn" onClick={() => setReviewRevealed(true)}>Reveal Translation</button>
                ) : (
                  <div className="rating-buttons">
                    {([1, 2, 3, 4] as const).map(r => (
                      <button key={r} onClick={() => handleRate(r)}>{r === 1 && hint ? 'Got it' : r}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <nav className="gt-bottom-nav">
        <button
          className={`gt-nav-btn${tab === 'translate' ? ' active' : ''}`}
          onClick={() => setTab('translate')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="currentColor"/>
          </svg>
          <span>Translate</span>
        </button>
        <button
          className={`gt-nav-btn${tab === 'history' ? ' active' : ''}`}
          onClick={() => setTab('history')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" fill="currentColor"/>
          </svg>
          <span>History</span>
        </button>
        {learningEnabled && (
          <button
            className={`gt-nav-btn${tab === 'review' ? ' active' : ''}`}
            onClick={switchToReview}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor"/>
            </svg>
            {dueCount > 0 && <span className="gt-nav-badge">{dueCount}</span>}
            <span>Review</span>
          </button>
        )}
      </nav>
    </div>
  )
}
