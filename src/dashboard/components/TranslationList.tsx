import type { Translation } from '../../shared/types/translation'
import type { Tag } from '../../shared/types/tag'

interface Props {
  items: Translation[]
  total: number
  selected: string | null
  selectedIds: Set<string>
  loading: boolean
  tagsMap: Map<string, Tag[]>
  onSelect: (t: Translation) => void
  onToggleSelect: (id: string) => void
  onStar: (t: Translation) => void
  onLoadMore: () => void
  hasMore: boolean
}

export function TranslationList({
  items,
  total,
  selected,
  selectedIds,
  loading,
  tagsMap,
  onSelect,
  onToggleSelect,
  onStar,
  onLoadMore,
  hasMore,
}: Props) {
  const truncate = (s: string, n = 60) => (s.length > n ? s.slice(0, n) + '…' : s)

  return (
    <div className="translation-list">
      <div className="list-toolbar">
        <span className="list-count">{total} translation{total !== 1 ? 's' : ''}</span>
      </div>
      {loading && <div className="list-empty">Loading…</div>}
      {!loading && items.length === 0 && (
        <div className="list-empty">No translations here yet</div>
      )}
      {items.map(t => {
        const lang = `${(t.sourceLang ?? '?').toUpperCase()} → ${(t.targetLang ?? '?').toUpperCase()}`
        const itemTags = tagsMap.get(t.id) ?? []
        return (
          <div
            key={t.id}
            className={`t-card${selected === t.id ? ' selected' : ''}`}
            onClick={() => onSelect(t)}
          >
            <div className="t-card-check" onClick={e => { e.stopPropagation(); onToggleSelect(t.id) }}>
              <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => {}} />
            </div>
            <div className="t-card-body">
              <div className="t-card-header">
                <span className="t-card-lang">{lang}</span>
                <button
                  className={`t-card-star${t.isStarred ? ' starred' : ''}`}
                  onClick={e => { e.stopPropagation(); onStar(t) }}
                >
                  {t.isStarred ? '★' : '☆'}
                </button>
                {t.srsEnabled && <span className="t-card-srs">SRS</span>}
              </div>
              <div className="t-card-source">{truncate(t.sourceText)}</div>
              <div className="t-card-translated">{truncate(t.translatedText)}</div>
              {itemTags.length > 0 && (
                <div className="t-card-tags">
                  {itemTags.map(tag => (
                    <span key={tag.id} className="tag-chip-sm">{tag.name}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
      {hasMore && (
        <div style={{ textAlign: 'center', padding: '12px' }}>
          <button className="btn" onClick={onLoadMore}>Load more</button>
        </div>
      )}
    </div>
  )
}
