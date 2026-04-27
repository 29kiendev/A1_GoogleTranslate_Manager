import type { Translation } from '../../shared/types/translation'

interface Props {
  item: Translation
  onCopyOriginal: (t: Translation) => void
  onCopyTranslation: (t: Translation) => void
  onCopyBoth: (t: Translation) => void
  onStar: (t: Translation) => void
  onMove: (t: Translation) => void
}

export function TranslationCard({
  item,
  onCopyOriginal,
  onCopyTranslation,
  onCopyBoth,
  onStar,
  onMove,
}: Props) {
  const langLabel = [item.sourceLang ?? '?', item.targetLang ?? '?'].join(' → ').toUpperCase()
  const truncate = (s: string, n = 80) => (s.length > n ? s.slice(0, n) + '…' : s)

  return (
    <div className="card">
      <div className="card-header">
        <span className="lang-badge">{langLabel}</span>
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
