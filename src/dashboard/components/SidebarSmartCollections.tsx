import { getBuiltinCollections } from '../../shared/constants/smartCollections'
import type { SmartCollection } from '../../shared/types/smartCollection'
import type { LangPairCount } from '../../shared/types/translation'

interface Props {
  selected: string | null
  dueCount: number
  langPairs: LangPairCount[]
  onSelectCollection: (c: SmartCollection) => void
  onSelectLangPair: (sourceLang: string, targetLang: string) => void
}

export function SidebarSmartCollections({
  selected,
  dueCount,
  langPairs,
  onSelectCollection,
  onSelectLangPair,
}: Props) {
  const collections = getBuiltinCollections()

  return (
    <>
      <div className="sidebar-section-label">Smart Collections</div>
      {collections.map(c => {
        const count = c.id === 'sc_due_review' ? dueCount : undefined
        return (
          <div
            key={c.id}
            className={`sidebar-item${selected === c.id ? ' active' : ''}`}
            onClick={() => onSelectCollection(c)}
          >
            <span className="sidebar-item-icon">{c.icon}</span>
            <span className="sidebar-item-name">{c.name}</span>
            {count !== undefined && count > 0 && (
              <span className="sidebar-item-count">{count}</span>
            )}
          </div>
        )
      })}
      {langPairs.length > 0 && (
        <>
          <div className="sidebar-section-label">Language Pairs</div>
          {langPairs.map(lp => {
            const id = `lp_${lp.sourceLang}_${lp.targetLang}`
            return (
              <div
                key={id}
                className={`sidebar-item${selected === id ? ' active' : ''}`}
                onClick={() => onSelectLangPair(lp.sourceLang, lp.targetLang)}
              >
                <span className="sidebar-item-icon">🌐</span>
                <span className="sidebar-item-name">
                  {lp.sourceLang.toUpperCase()} → {lp.targetLang.toUpperCase()}
                </span>
                <span className="sidebar-item-count">{lp.count}</span>
              </div>
            )
          })}
        </>
      )}
    </>
  )
}
