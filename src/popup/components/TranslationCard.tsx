import type { Translation } from '../../shared/types/translation'

interface Props {
  item: Translation
  selected?: boolean
  onCopyOriginal: (t: Translation) => void
  onCopyTranslation: (t: Translation) => void
  onCopyBoth: (t: Translation) => void
  onStar: (t: Translation) => void
  onMove: (t: Translation) => void
}

export function TranslationCard({
  item,
  selected,
  onCopyOriginal,
  onCopyTranslation,
  onCopyBoth,
  onStar,
  onMove,
}: Props) {
  const langCode = [item.sourceLang ?? '?', item.targetLang ?? '?'].join(' → ').toUpperCase()
  const langLabel = (item.sourceLangLabel && item.targetLangLabel)
    ? `${item.sourceLangLabel} → ${item.targetLangLabel}`
    : langCode

  const truncate = (s: string, n = 80) => (s.length > n ? s.slice(0, n) + '…' : s)

  return (
    <div className={`card${selected ? ' selected' : ''}`}>
      <div className="card-header">
        <span className="lang-badge" title={langCode}>{langLabel}</span>
        <button
          className={`star-btn${item.isStarred ? ' starred' : ''}`}
          onClick={() => onStar(item)}
          title={item.isStarred ? 'Unstar' : 'Star'}
        >
          {item.isStarred ? '★' : '☆'}
        </button>
      </div>
      <div className="card-source">{truncate(item.sourceText)}</div>
      <div className="card-translated">{truncate(item.translatedText)}</div>
      <div className="card-actions">
        <button onClick={() => onCopyOriginal(item)}>Copy O</button>
        <button onClick={() => onCopyTranslation(item)}>Copy T</button>
        <button onClick={() => onCopyBoth(item)}>Copy Both</button>
        <button onClick={() => onMove(item)}>Move</button>
      </div>
    </div>
  )
}
