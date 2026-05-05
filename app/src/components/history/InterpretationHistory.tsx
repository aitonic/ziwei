import type { InterpretationHistoryEntry } from '@/lib/interpretation-history'

interface InterpretationHistoryProps {
  title: string
  entries: InterpretationHistoryEntry[]
  onSelect?: (entry: InterpretationHistoryEntry) => void
  onDelete?: (entryId: string) => void
}

export function InterpretationHistory({ title, entries, onSelect, onDelete }: InterpretationHistoryProps) {
  if (entries.length === 0) return null

  return (
    <section
      className="
        relative p-5 lg:p-6
        bg-white/[0.025] backdrop-blur-xl
        border border-white/[0.07] rounded-2xl
      "
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <h3 className="text-base lg:text-lg font-semibold text-text">
          {title}
        </h3>
        <span className="text-xs text-text-muted">近 5 轮</span>
      </div>

      <div className="grid gap-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="
              group relative rounded-xl
              bg-white/[0.03] border border-white/[0.06]
              hover:bg-white/[0.06] hover:border-white/[0.12]
              transition-all duration-200
            "
          >
            <button
              type="button"
              onClick={() => onSelect?.(entry)}
              className="w-full text-left p-3 pr-12"
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="
                      shrink-0 px-1.5 py-0.5 rounded-md
                      bg-star/15 text-star-light text-[10px]
                    "
                  >
                    {entry.kind === 'fortune' ? '年度' : '命盘'}
                  </span>
                  <span className="truncate text-sm text-text-secondary group-hover:text-text">
                    {entry.title}
                  </span>
                </div>
                <time className="shrink-0 text-[10px] text-text-muted">
                  {formatHistoryTime(entry.createdAt)}
                </time>
              </div>
              <p className="line-clamp-2 text-xs leading-relaxed text-text-muted">
                {entry.content.replace(/[#>*_\-\n]/g, ' ').trim()}
              </p>
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                className="
                  absolute right-2 top-2
                  w-8 h-8 rounded-lg
                  text-text-muted hover:text-misfortune
                  hover:bg-misfortune/10
                  transition-colors
                "
                aria-label="删除这条历史"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function formatHistoryTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
