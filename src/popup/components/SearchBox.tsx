import { useEffect, useRef } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function SearchBox({ value, onChange, placeholder = 'Search translations…' }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  return (
    <div className="search-box">
      <span className="search-icon">🔍</span>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="clear-btn" onClick={() => onChange('')}>✕</button>
      )}
    </div>
  )
}
