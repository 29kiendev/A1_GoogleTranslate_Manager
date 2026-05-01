import { getBuiltinCollections } from '../../shared/constants/smartCollections'
import type { SmartCollection } from '../../shared/types/smartCollection'      
import type { LangPairCount } from '../../shared/types/translation'
import type { Tag } from '../../shared/types/tag'

interface Props {
  selected: string | null
  dueCount: number
  collectionCounts: Record<string, number>
  langPairs: LangPairCount[]
  tags: Tag[]
  onSelectCollection: (c: SmartCollection) => void
  onSelectLangPair: (sourceLang: string, targetLang: string) => void
  onSelectTag: (tagId: string) => void
}

export function SidebarSmartCollections({
  selected,
  dueCount,
  collectionCounts,
  langPairs,
  tags,
  onSelectCollection,
  onSelectLangPair,
  onSelectTag,
}: Props) {
  const collections = getBuiltinCollections()

  return (
    <>
      <div className="sidebar-section-label">Smart Collections</div>
      {collections.map(c => {
        const count = c.id === 'sc_due_review' ? dueCount : collectionCounts[c.id]
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
      {tags.length > 0 && (
        <>
          <div className="sidebar-section-label">Tags</div>
          {tags.map(tag => (
            <div
              key={tag.id}
              className={`sidebar-item${selected === `tag_${tag.id}` ? ' active' : ''}`}
              onClick={() => onSelectTag(tag.id)}
            >
              <span className="sidebar-item-icon">
                {tag.color ? 
                  <span className="tag-dot" style={{ background: tag.color, width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }} /> : 
                  '🏷️'
                }
              </span>
              <span className="sidebar-item-name">{tag.name}</span>
            </div>
          ))}
        </>
      )}
    </>
  )
}
