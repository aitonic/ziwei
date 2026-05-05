export const HISTORY_LIMIT = 5

export type InterpretationHistoryKind = 'chart' | 'fortune'

export interface InterpretationHistoryEntry {
  id: string
  kind: InterpretationHistoryKind
  title: string
  content: string
  createdAt: number
  year?: number
}

interface CreateHistoryEntryParams {
  kind: InterpretationHistoryKind
  title: string
  content: string
  createdAt?: number
  year?: number
}

export function createHistoryEntry({
  kind,
  title,
  content,
  createdAt = Date.now(),
  year,
}: CreateHistoryEntryParams): InterpretationHistoryEntry {
  return {
    id: `${kind}-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    title,
    content,
    createdAt,
    year,
  }
}

export function prependHistoryEntry(
  history: InterpretationHistoryEntry[],
  entry: InterpretationHistoryEntry
): InterpretationHistoryEntry[] {
  if (!entry.content.trim()) {
    return history
  }

  return [entry, ...history].slice(0, HISTORY_LIMIT)
}
