export interface TsvRow {
  sourceText: string
  translatedText: string
  note?: string
}

export function parseTsv(raw: string): TsvRow[] {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const cols = line.split('\t').map(c => c.trim())
      const sourceText = cols[0] ?? ''
      const translatedText = cols[1] ?? ''
      const note = cols[2]
      return { sourceText, translatedText, ...(note ? { note } : {}) }
    })
    .filter(row => row.sourceText !== '' && row.translatedText !== '')
}

export function toTsvLine(cells: string[]): string {
  return cells.map(c => c.replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')
}
