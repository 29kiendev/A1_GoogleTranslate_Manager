import { useState, useEffect } from 'react'
import type { Translation } from '../../shared/types/translation'   
import type { Folder } from '../../shared/types/folder'
import type { Tag } from '../../shared/types/tag'
import { sendMessage } from '../../shared/services/messagingService'
import { formatDate } from '../../shared/utils/date'

interface Props {
  item: Translation
  folders: Folder[]
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

export function TranslationDetail({ item, folders, onClose, onUpdated, onDeleted }: Props) {
  const [note, setNote] = useState(item.note ?? '')
  const [noteDirty, setNoteDirty] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6366f1')
  const [showTagInput, setShowTagInput] = useState(false)

  useEffect(() => {
    setNote(item.note ?? '')
    setNoteDirty(false)
    loadTags()
  }, [item.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTags = async () => {
    const [tagsRes, allRes] = await Promise.all([
      sendMessage<Tag[]>({ type: 'GET_TAGS_FOR_TRANSLATION', payload: item.id }),
      sendMessage<Tag[]>({ type: 'GET_TAGS' }),
    ])
    if (tagsRes?.ok && tagsRes.data) setTags(tagsRes.data)
    if (allRes?.ok && allRes.data) setAllTags(allRes.data)
  }

  const langCode = `${(item.sourceLang ?? '?').toUpperCase()} → ${(item.targetLang ?? '?').toUpperCase()}`
  const langLabel = (item.sourceLangLabel && item.targetLangLabel)
    ? `${item.sourceLangLabel} → ${item.targetLangLabel}`
    : langCode

  const handleSaveNote = async () => {
    const res = await sendMessage<Translation>({
      type: 'UPDATE_TRANSLATION',
      payload: { id: item.id, patch: { note } },
    })
    if (res?.ok && res.data) onUpdated(res.data)
    setNoteDirty(false)
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
    onDeleted(item.id) // Notify parent it's gone from current view (trash)
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
    const existing = allTags.find(t => t.slug === name.toLowerCase().replace(/\s+/g, '-'))
    let tagId: string
    if (existing) {
      tagId = existing.id
    } else {
      const res = await sendMessage<Tag>({ type: 'CREATE_TAG', payload: { name, color: newTagColor } })
      if (!res?.ok || !res.data) return
      tagId = res.data.id
    }
    await sendMessage({ type: 'ADD_TAG_TO_TRANSLATION', payload: { translationId: item.id, tagId } })
    setNewTagName('')
    setShowTagInput(false)
    await loadTags()
  }

  const handleRemoveTag = async (tagId: string) => {
    await sendMessage({ type: 'REMOVE_TAG_FROM_TRANSLATION', payload: { translationId: item.id, tagId } })
    setTags(prev => prev.filter(t => t.id !== tagId))
  }

  const sourceUrl = item.metadata?.sourceUrl
  const folder = folders.find(f => f.id === item.folderId)
  const nextReviewLabel = item.nextReviewAt
    ? `Next review: ${formatDate(item.nextReviewAt)}`
    : null

  const unattachedTags = allTags.filter(t => !tags.some(at => at.id === t.id))

  const copyMarkdown = () =>
    copyText(`**${item.sourceText}** — ${item.translatedText}${item.note ? `\n> ${item.note}` : ''}`)

  const copyTsv = () =>
    copyText(`${item.sourceText}\t${item.translatedText}${item.note ? `\t${item.note}` : ''}`)

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <span className="detail-lang" title={langCode}>{langLabel}</span>
        <button className="detail-close" onClick={onClose}>✖</button>
      </div>
      <div className="detail-body">
        <div className="detail-field">
          <div className="detail-field-label">Original</div>
          <div className="detail-field-value">{item.sourceText}</div>
        </div>
        <div className="detail-field">
          <div className="detail-field-label">Translation</div>
          <div className="detail-field-value translated">{item.translatedText}</div>
          {sourceUrl && (
            <a className="detail-reopen" href={sourceUrl} target="_blank" rel="noreferrer">
              ↗ Re-open in Google Translate
            </a>
          )}
        </div>
        <div className="detail-field">
          <div className="detail-field-label">Folder</div>
          <select
            style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}
            value={item.folderId ?? ''}
            onChange={e => handleMove(e.target.value || null)}
          >
            <option value="">Uncategorized</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{'  '.repeat(f.depth)}{f.name}</option>
            ))}
          </select>
        </div>
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
                <button key={t.id} className="tag-suggest-btn" onClick={() => { handleAddExistingTag(t.id); setShowTagInput(false) }}>
                  {t.name}
                </button>
              ))}
              <input
                className="tag-new-input"
                placeholder="New tag…"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateAndAddTag() }}
                autoFocus
              />
              <input
                type="color"
                className="tag-color-input"
                value={newTagColor}
                onChange={e => setNewTagColor(e.target.value)}
                title="Tag color"
              />
              {newTagName.trim() && (
                <button className="tag-suggest-btn" onClick={handleCreateAndAddTag}>Add "{newTagName.trim()}"</button>
              )}
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
        <div className="detail-field">
          <div className="detail-field-label">Spaced Repetition</div>
          <span className={`detail-srs-badge${item.srsEnabled ? ' enrolled' : ' not-enrolled'}`}>
            {item.srsEnabled ? '🔥 Enrolled' : 'Not enrolled'}
          </span>
          {item.srsEnabled && nextReviewLabel && (
            <div className="detail-meta">{nextReviewLabel}</div>
          )}
          {item.srsEnabled && (
            <div className="detail-meta">
              Interval: {item.srsInterval}d · Ease: {item.srsEaseFactor.toFixed(2)} · Reps: {item.srsRepetitions}
            </div>
          )}
        </div>
        <div className="detail-field">
          <div className="detail-field-label">Stats</div>
          <div className="detail-meta">Looked up {item.usageCount}× · Added {formatDate(item.createdAt)}</div>
          {item.lastUsedAt && <div className="detail-meta">Last used {formatDate(item.lastUsedAt)}</div>}
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
            <button onClick={copyMarkdown}>Copy Markdown</button>
            <button onClick={copyTsv}>Copy TSV</button>
            <button onClick={handleStar}>{item.isStarred ? '★ Unstar' : '☆ Star'}</button>
            <button className="btn-primary" onClick={handleEnrollSRS}>
              {item.srsEnabled ? 'Unenroll SRS' : 'Enroll in SRS'}
            </button>
            <button className="btn-danger" onClick={handleDelete}>Delete</button>
          </>
        )}
      </div>
    </div>
  )
}
