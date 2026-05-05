import { useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useContentCacheStore } from '@/stores'

const PANEL_WIDTH = 380
const PANEL_HEIGHT = 460

export function PalaceDetailPanel() {
  const {
    aiInterpretation,
    palaceInterpretations,
    palaceDetailStatus,
    selectedPalace,
    isPalacePanelOpen,
    palacePanelPosition,
    closePalaceDetail,
    setPalacePanelPosition,
  } = useContentCacheStore()
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragOffsetRef.current = {
      x: event.clientX - palacePanelPosition.x,
      y: event.clientY - palacePanelPosition.y,
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const maxX = Math.max(8, window.innerWidth - PANEL_WIDTH - 8)
      const maxY = Math.max(8, window.innerHeight - PANEL_HEIGHT - 8)
      setPalacePanelPosition({
        x: Math.min(Math.max(8, moveEvent.clientX - dragOffsetRef.current.x), maxX),
        y: Math.min(Math.max(8, moveEvent.clientY - dragOffsetRef.current.y), maxY),
      })
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }, [palacePanelPosition.x, palacePanelPosition.y, setPalacePanelPosition])

  if (!isPalacePanelOpen || !selectedPalace) return null

  const content = palaceInterpretations[selectedPalace]
  const isLoading = palaceDetailStatus === 'loading'
  const hasError = palaceDetailStatus === 'error'
  const hasMainInterpretation = Boolean(aiInterpretation)

  return (
    <aside
      className="
        fixed z-50 w-[min(92vw,380px)] max-h-[70vh]
        overflow-hidden rounded-2xl
        bg-night/95 backdrop-blur-2xl
        border border-white/[0.12]
        shadow-[0_24px_80px_rgba(0,0,0,0.45)]
      "
      style={{ left: palacePanelPosition.x, top: palacePanelPosition.y }}
    >
      <div
        onPointerDown={handlePointerDown}
        className="
          flex items-center justify-between gap-3
          px-4 py-3 cursor-move select-none
          border-b border-white/[0.08]
          bg-white/[0.04]
        "
      >
        <div>
          <p className="text-xs text-text-muted">宫位详解</p>
          <h3 className="text-base font-semibold text-gold">{selectedPalace}</h3>
        </div>
        <button
          type="button"
          onClick={closePalaceDetail}
          className="
            w-8 h-8 rounded-lg
            text-text-muted hover:text-text
            hover:bg-white/[0.07]
            transition-colors
          "
          aria-label="关闭宫位详解"
        >
          ×
        </button>
      </div>

      <div className="max-h-[calc(70vh-64px)] overflow-y-auto px-4 py-4">
        {content ? (
          <div
            className="
              prose prose-invert max-w-none
              prose-p:leading-relaxed prose-p:text-text-secondary
              prose-strong:text-gold prose-headings:text-star-light
              text-sm
            "
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        ) : isLoading ? (
          <p className="text-sm leading-relaxed text-text-muted">
            宫位详解正在生成中，稍候再看。
          </p>
        ) : hasError ? (
          <p className="text-sm leading-relaxed text-misfortune">
            宫位详解生成失败，请重新点击「开始解读」。
          </p>
        ) : hasMainInterpretation ? (
          <p className="text-sm leading-relaxed text-text-muted">
            这条解读没有宫位详解数据。请重新点击「开始解读」生成新版宫位详解。
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-text-muted">
            尚未生成宫位解读。请先点击「开始解读」。
          </p>
        )}
      </div>
    </aside>
  )
}
