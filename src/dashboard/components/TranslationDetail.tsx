import { useState, useEffect, useCallback } from 'react'
import type { Translation } from '../../shared/types/translation'   
import type { Folder } from '../../shared/types/folder'
import type { Tag } from '../../shared/types/tag'
import { sendMessage } from '../../shared/services/messagingService'
import { formatDate } from '../../shared/utils/date'

interface Props {
  item: Translation
  folders: Folder[]
  autoExpand?: boolean
  hasPrev?: boolean
  hasNext?: boolean
  onPrev?: () => void
  onNext?: () => void
  learningEnabled?: boolean
  onClose: () => void
  onUpdated: (updated: Translation) => void
  onDeleted: (id: string) => void
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  })
}

export function TranslationDetail({
  item,
  folders,
  autoExpand,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  learningEnabled = true,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const [note, setNote] = useState(item.note ?? '')
  const [noteDirty, setNoteDirty] = useState(false)
  const [editingSource, setEditingSource] = useState(false)
  const [editingTranslation, setEditingTranslation] = useState(false)
  const [sourceEdit, setSourceEdit] = useState(item.sourceText)
  const [translationEdit, setTranslationEdit] = useState(item.translatedText)
  const [tags, setTags] = useState<Tag[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [phrasebooks, setPhrasebooks] = useState<any[]>([])
  const [memberOf, setMemberOf] = useState<string[]>([])

  const loadTags = useCallback(async () => {
    const [tagsRes, allRes] = await Promise.all([
      sendMessage<Tag[]>({ type: 'GET_TAGS_FOR_TRANSLATION', payload: item.id }),
      sendMessage<Tag[]>({ type: 'GET_TAGS' }),
    ])
    if (tagsRes?.ok && tagsRes.data) setTags(tagsRes.data)
    if (allRes?.ok && allRes.data) setAllTags(allRes.data)
  }, [item.id])

  const loadPhrasebooks = useCallback(async () => {
    const res = await sendMessage<any[]>({ type: 'GET_PHRASEBOOKS' })
    if (res?.ok && res.data) {
      setPhrasebooks(res.data)
      const membership = await Promise.all(res.data.map(async pb => {
        const itemsRes = await sendMessage<any[]>({ type: 'GET_PHRASEBOOK_ITEMS', payload: { phrasebookId: pb.id } })
        if (itemsRes?.ok && itemsRes.data?.some((i: any) => i.translationId === item.id)) return pb.id
        return null
      }))
      setMemberOf(membership.filter(Boolean) as string[])
    }
  }, [item.id])

  useEffect(() => {
    setNote(item.note ?? '')
    setNoteDirty(false)
    setSourceEdit(item.sourceText)
    setTranslationEdit(item.translatedText)
    setEditingSource(false)
    setEditingTranslation(false)
    loadTags()
    loadPhrasebooks()
  }, [item.id, loadTags, loadPhrasebooks])

  useEffect(() => {
    if (expanded) {
      const h = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setExpanded(false)
      }
      window.addEventListener('keydown', h)
      return () => window.removeEventListener('keydown', h)
    }
  }, [expanded])

  useEffect(() => {
    if (autoExpand) setExpanded(true)
  }, [autoExpand])

  const handleSaveNote = async () => {
    const res = await sendMessage<Translation>({
      type: 'UPDATE_TRANSLATION',
      payload: { id: item.id, patch: { note } },
    })
    if (res?.ok && res.data) onUpdated(res.data)
    setNoteDirty(false)
  }

  const handleSaveEdits = async (field: 'sourceText' | 'translatedText', value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const res = await sendMessage<Translation>({
      type: 'UPDATE_TRANSLATION',
      payload: { id: item.id, patch: { [field]: trimmed } },
    })
    if (res?.ok && res.data) onUpdated(res.data)
    if (field === 'sourceText') setEditingSource(false)
    else setEditingTranslation(false)
  }

  const handleStar = async () => {
    const res = await sendMessage({ type: 'STAR_TRANSLATION', payload: item.id })
    if (res?.ok) onUpdated({ ...item, isStarred: !item.isStarred })
  }

  const handleEnrollSRS = async () => {
    if (item.srsEnabled) {
      await sendMessage({ type: 'UNENROLL_SRS', payload: item.id })
      onUpdated({ ...item, srsEnabled: false, nextReviewAt: null })
    } else {
      await sendMessage({ type: 'ENROLL_SRS', payload: item.id })
      onUpdated({ ...item, srsEnabled: true, nextReviewAt: Date.now() + 86_400_000 })
    }
  }

  const handleMove = async (folderId: string | null) => {
    await sendMessage({ type: 'MOVE_TRANSLATION', payload: { id: item.id, folderId } })
    onUpdated({ ...item, folderId })
  }

  const handleDelete = async () => {
    if (!confirm('Delete this translation?')) return
    await sendMessage({ type: 'DELETE_TRANSLATION', payload: item.id })
    onDeleted(item.id)
  }

  const handleRestore = async () => {
    await sendMessage({ type: 'RESTORE_TRANSLATION', payload: item.id })
    onDeleted(item.id)
  }

  const handlePermanentDelete = async () => {
    if (!confirm('Permanently delete this translation? This cannot be undone.')) return
    await sendMessage({ type: 'PERMANENT_DELETE_TRANSLATION', payload: item.id })
    onDeleted(item.id)
  }

  const handleAddExistingTag = async (tagId: string) => {
    await sendMessage({ type: 'ADD_TAG_TO_TRANSLATION', payload: { translationId: item.id, tagId } })
    await loadTags()
  }

  const handleCreateAndAddTag = async () => {
    const name = newTagName.trim()
    if (!name) return
    const res = await sendMessage<Tag>({ type: 'CREATE_TAG', payload: { name } })
    if (res?.ok && res.data) {
      await sendMessage({ type: 'ADD_TAG_TO_TRANSLATION', payload: { translationId: item.id, tagId: res.data.id } })
      setNewTagName('')
      setShowTagInput(false)
      await loadTags()
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    await sendMessage({ type: 'REMOVE_TAG_FROM_TRANSLATION', payload: { translationId: item.id, tagId } })
    setTags(prev => prev.filter(t => t.id !== tagId))
  }

  const handlePhrasebookToggle = async (pbId: string, add: boolean) => {
    if (add) {
      await sendMessage({ type: 'ADD_TO_PHRASEBOOK', payload: { phrasebookId: pbId, translationId: item.id } })
      setMemberOf(prev => [...prev, pbId])
    } else {
      await sendMessage({ type: 'REMOVE_FROM_PHRASEBOOK', payload: { phrasebookId: pbId, translationId: item.id } })
      setMemberOf(prev => prev.filter(id => id !== pbId))
    }
  }

  const langCode = `${(item.sourceLang ?? '?').toUpperCase()} → ${(item.targetLang ?? '?').toUpperCase()}`
  const langLabel = (item.sourceLangLabel && item.targetLangLabel)
    ? `${item.sourceLangLabel} → ${item.targetLangLabel}`
    : langCode

  const sourceUrl = item.metadata?.sourceUrl
  const folder = folders.find(f => f.id === item.folderId)
  const nextReviewLabel = item.nextReviewAt ? `Next review: ${formatDate(item.nextReviewAt)}` : null
  const unattachedTags = allTags.filter(t => !tags.some(at => at.id === t.id))

  const renderPhrasebookSelector = () => (
    <div className="detail-field">
      <div className="detail-field-label">Phrasebooks</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {phrasebooks.map(pb => {
          const isMember = memberOf.includes(pb.id)
          return (
            <button
              key={pb.id}
              onClick={() => handlePhrasebookToggle(pb.id, !isMember)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                borderRadius: 12,
                border: '1px solid',
                borderColor: isMember ? 'var(--blue)' : 'var(--border)',
                background: isMember ? 'var(--blue-light)' : 'transparent',
                color: isMember ? 'var(--blue)' : 'var(--muted)',
                cursor: 'pointer',
                transition: 'all .15s'
              }}
            >
              {isMember ? '✓ ' : '+ '} {pb.name}
            </button>
          )
        })}
        {phrasebooks.length === 0 && <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>No phrasebooks created.</span>}
      </div>
    </div>
  )

  const renderNav = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        className="detail-nav-btn"
        onClick={onPrev}
        disabled={!hasPrev}
        title="Previous item"
      >←</button>
      <button
        className="detail-nav-btn"
        onClick={onNext}
        disabled={!hasNext}
        title="Next item"
      >→</button>
    </div>
  )

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <span className="detail-lang" title={langCode}>{langLabel}</span>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {renderNav()}
          <div style={{ width: 8 }} />
          <button className="detail-expand-btn" onClick={() => setExpanded(true)} title="Expand view">⤢</button>
          <button className="detail-close" onClick={onClose}>✖</button>
        </div>
      </div>
      <div className="detail-body">
        <div className="detail-field">
          <div className="detail-field-label">Original</div>
          {editingSource ? (
            <textarea
              className="detail-note-input"
              autoFocus
              value={sourceEdit}
              onChange={e => setSourceEdit(e.target.value)}
              onBlur={() => handleSaveEdits('sourceText', sourceEdit)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveEdits('sourceText', sourceEdit) }}
            />
          ) : (
            <div
              className="detail-field-value"
              title="Click to edit"
              style={{ cursor: 'text' }}
              onClick={() => { setSourceEdit(item.sourceText); setEditingSource(true) }}
            >{item.sourceText}</div>
          )}
          {item.metadata?.context && (
            <div className="detail-context" style={{ marginTop: 8 }}>
              <span className="detail-field-label" style={{ fontSize: 11 }}>Context</span>
              <p className="detail-context-text">{item.metadata.context}</p>
            </div>
          )}
        </div>
        <div className="detail-field">
          <div className="detail-field-label">Translation</div>
          {editingTranslation ? (
            <textarea
              className="detail-note-input"
              autoFocus
              value={translationEdit}
              onChange={e => setTranslationEdit(e.target.value)}
              onBlur={() => handleSaveEdits('translatedText', translationEdit)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveEdits('translatedText', translationEdit) }}
            />
          ) : (
            <div
              className="detail-field-value translated"
              title="Click to edit"
              style={{ cursor: 'text' }}
              onClick={() => { setTranslationEdit(item.translatedText); setEditingTranslation(true) }}
            >{item.translatedText}</div>
          )}
          {sourceUrl && <a className="detail-reopen" href={sourceUrl} target="_blank" rel="noreferrer">↗ Re-open in Google Translate</a>}
        </div>
        <div className="detail-field">
          <div className="detail-field-label">Folder</div>
          <select
            style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}
            value={item.folderId ?? ''}
            onChange={e => handleMove(e.target.value || null)}
          >
            <option value="">Uncategorized</option>
            {folders.map(f => <option key={f.id} value={f.id}>{'  '.repeat(f.depth)}{f.name}</option>)}
          </select>
        </div>

        {phrasebooks.length > 0 && renderPhrasebookSelector()}

        <div className="detail-field">
          <div className="detail-field-label">Tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {tags.map(tag => (
              <span key={tag.id} className="tag-chip">
                {tag.color && <span className="tag-dot" style={{ background: tag.color }} />}
                {tag.name}
                <button className="tag-chip-remove" onClick={() => handleRemoveTag(tag.id)}>×</button>
              </span>
            ))}
            <button className="tag-add-btn" onClick={() => setShowTagInput(v => !v)}>+ Tag</button>
          </div>
          {showTagInput && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {unattachedTags.map(t => (
                <button key={t.id} className="tag-suggest-btn" onClick={() => { handleAddExistingTag(t.id); setShowTagInput(false) }}>{t.name}</button>
              ))}
              <input
                className="tag-new-input"
                placeholder="New tag…"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateAndAddTag() }}
                autoFocus
              />
            </div>
          )}
        </div>
        <div className="detail-field">
          <div className="detail-field-label">Note</div>
          <textarea
            className="detail-note-input"
            value={note}
            placeholder="Add a note…"
            onChange={e => { setNote(e.target.value); setNoteDirty(true) }}
            onBlur={() => { if (noteDirty) handleSaveNote() }}
          />
        </div>
        {learningEnabled && (
          <div className="detail-field">
            <div className="detail-field-label">Spaced Repetition</div>
            <span className={`detail-srs-badge${item.srsEnabled ? ' enrolled' : ' not-enrolled'}`}>
              {item.srsEnabled ? '🔥 Enrolled' : 'Not enrolled'}
            </span>
            {item.srsEnabled && nextReviewLabel && <div className="detail-meta">{nextReviewLabel}</div>}
          </div>
        )}
        <div className="detail-field">
          <div className="detail-field-label">Stats</div>
          <div className="detail-meta">Looked up {item.usageCount}× · Added {formatDate(item.createdAt)}</div>
          {folder && <div className="detail-meta">In: {folder.pathCache}</div>}
        </div>
      </div>
      <div className="detail-actions">
        {item.isDeleted ? (
          <>
            <button className="btn-primary" onClick={handleRestore}>Restore</button>
            <button className="btn-danger" onClick={handlePermanentDelete}>Delete Permanently</button>
          </>
        ) : (
          <>
            <button onClick={() => copyText(item.sourceText)}>Copy Original</button>
            <button onClick={() => copyText(item.translatedText)}>Copy Translation</button>
            <button onClick={handleStar}>{item.isStarred ? '★ Unstar' : '☆ Star'}</button>
            {learningEnabled && (
              <button className="btn-primary" onClick={handleEnrollSRS}>{item.srsEnabled ? 'Unenroll SRS' : 'Enroll in SRS'}</button>
            )}
            <button className="btn-danger" onClick={handleDelete}>Delete</button>
          </>
        )}
      </div>

      {expanded && (
        <div className="detail-modal-overlay" onClick={() => setExpanded(false)}>
          <div className="detail-modal" onClick={e => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <span>{item.sourceText.substring(0, 80)}{item.sourceText.length > 80 ? '…' : ''}</span>
                {renderNav()}
              </div>
              <button onClick={() => setExpanded(false)}>✕</button>
            </div>
            
            <div className="detail-field">
              <div className="detail-field-label">Original</div>
              {editingSource ? (
                <textarea
                  className="detail-note-input"
                  autoFocus
                  style={{ fontSize: '16px' }}
                  value={sourceEdit}
                  onChange={e => setSourceEdit(e.target.value)}
                  onBlur={() => handleSaveEdits('sourceText', sourceEdit)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveEdits('sourceText', sourceEdit) }}
                />
              ) : (
                <div
                  className="detail-field-value"
                  title="Click to edit"
                  style={{ cursor: 'text', fontSize: '16px' }}
                  onClick={() => { setSourceEdit(item.sourceText); setEditingSource(true) }}
                >{item.sourceText}</div>
              )}
              {item.metadata?.context && (
                <div className="detail-context" style={{ marginTop: 8 }}>
                  <span className="detail-field-label" style={{ fontSize: 11 }}>Context</span>
                  <p className="detail-context-text">{item.metadata.context}</p>
                </div>
              )}
            </div>
            <div className="detail-field">
              <div className="detail-field-label">Translation</div>
              {editingTranslation ? (
                <textarea
                  className="detail-note-input"
                  autoFocus
                  style={{ fontSize: '18px' }}
                  value={translationEdit}
                  onChange={e => setTranslationEdit(e.target.value)}
                  onBlur={() => handleSaveEdits('translatedText', translationEdit)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveEdits('translatedText', translationEdit) }}
                />
              ) : (
                <div
                  className="detail-field-value translated"
                  title="Click to edit"
                  style={{ cursor: 'text', fontSize: '18px' }}
                  onClick={() => { setTranslationEdit(item.translatedText); setEditingTranslation(true) }}
                >{item.translatedText}</div>
              )}
              {sourceUrl && <a className="detail-reopen" href={sourceUrl} target="_blank" rel="noreferrer">↗ Re-open in Google Translate</a>}
            </div>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div className="detail-field">
                  <div className="detail-field-label">Folder</div>
                  <select
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}
                    value={item.folderId ?? ''}
                    onChange={e => handleMove(e.target.value || null)}
                  >
                    <option value="">Uncategorized</option>
                    {folders.map(f => <option key={f.id} value={f.id}>{'  '.repeat(f.depth)}{f.name}</option>)}
                  </select>
                </div>
                {phrasebooks.length > 0 && renderPhrasebookSelector()}
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <div className="detail-field">
                  <div className="detail-field-label">Tags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                    {tags.map(tag => (
                      <span key={tag.id} className="tag-chip">
                        {tag.color && <span className="tag-dot" style={{ background: tag.color }} />}
                        {tag.name}
                        <button className="tag-chip-remove" onClick={() => handleRemoveTag(tag.id)}>×</button>
                      </span>
                    ))}
                    <button className="tag-add-btn" onClick={() => setShowTagInput(v => !v)}>+ Tag</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-field">
              <div className="detail-field-label">Note</div>
              <textarea
                className="detail-note-input"
                style={{ minHeight: '120px', fontSize: '13px' }}
                value={note}
                placeholder="Add a note…"
                onChange={e => { setNote(e.target.value); setNoteDirty(true) }}
                onBlur={() => { if (noteDirty) handleSaveNote() }}
              />
            </div>

            <div className="detail-actions" style={{ padding: '16px 0 0', borderTop: '1px solid var(--border)' }}>
               <button onClick={() => copyText(item.sourceText)}>Copy Original</button>
               <button onClick={() => copyText(item.translatedText)}>Copy Translation</button>
               <button onClick={handleStar}>{item.isStarred ? '★ Unstar' : '☆ Star'}</button>
               {learningEnabled && (
                 <button className="btn-primary" onClick={handleEnrollSRS}>{item.srsEnabled ? 'Unenroll SRS' : 'Enroll in SRS'}</button>
               )}
               <button className="btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
