/* ============================================================
   AI 解读组件
   丝滑流式输出 + 书法字体 + Markdown 渲染
   ============================================================ */

import { useState, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChartStore, useSettingsStore, useContentCacheStore } from '@/stores'
import { extractKnowledge, buildPromptContext } from '@/knowledge'
import { streamChat, type LLMConfig } from '@/lib/llm'
import {
  buildInterpretationMessages,
  parseInterpretationResponse,
  shouldRestoreCachedInterpretation,
} from '@/lib/ai-interpretation'
import { Button } from '@/components/ui'
import { InterpretationHistory } from '@/components/history'
import type { InterpretationHistoryEntry } from '@/lib/interpretation-history'

/* ------------------------------------------------------------
   Markdown 自定义样式组件
   ------------------------------------------------------------ */

const MarkdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-gold mt-6 mb-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-semibold text-gold/90 mt-5 mb-2">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-medium text-star-light mt-4 mb-2">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="text-gold font-semibold">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-none space-y-1.5 mb-3 pl-4">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside space-y-1.5 mb-3 pl-2">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="relative pl-4 before:content-['◆'] before:absolute before:left-0 before:text-star/60 before:text-xs">
      {children}
    </li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-gold/40 pl-4 my-3 italic text-text-secondary">
      {children}
    </blockquote>
  ),
}

/* ------------------------------------------------------------
   AI 解读面板组件
   ------------------------------------------------------------ */

export function AIInterpretation() {
  const { chart, birthInfo } = useChartStore()
  const { provider, providerSettings, enableThinking, enableWebSearch, searchApiKey } = useSettingsStore()
  const {
    aiInterpretation,
    chartInterpretationHistory,
    setAiInterpretation,
    setPalaceInterpretations,
    addChartInterpretationHistory,
  } = useContentCacheStore()
  const currentSettings = providerSettings[provider]

  const [displayText, setDisplayText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 组件挂载时，如果有缓存则直接显示
  useEffect(() => {
    if (shouldRestoreCachedInterpretation(aiInterpretation, displayText, loading)) {
      setDisplayText(aiInterpretation || '')
    }
  }, [aiInterpretation, displayText, loading])

  /* ------------------------------------------------------------
     开始解读
     ------------------------------------------------------------ */

  const handleInterpret = useCallback(async () => {
    if (!chart || !birthInfo) return

    // 重置状态
    setLoading(true)
    setError(null)
    setAiInterpretation('')
    setPalaceInterpretations({})
    setDisplayText('')

    try {
      // 提取知识上下文
      const knowledge = extractKnowledge(chart, birthInfo.year)
      const contextStr = buildPromptContext(knowledge)

      const messages = buildInterpretationMessages({
        birthInfo,
        fiveElementsClass: chart.fiveElementsClass,
        context: contextStr,
      })

      const config: LLMConfig = {
        provider,
        apiKey: currentSettings.apiKey,
        baseUrl: currentSettings.customBaseUrl || undefined,
        model: currentSettings.customModel || undefined,
        enableThinking,
        enableWebSearch,
        searchApiKey: searchApiKey || undefined,
        useServerProxy: !currentSettings.apiKey,
      }

      let rawText = ''
      for await (const token of streamChat(config, messages)) {
        rawText += token
      }

      const parsed = parseInterpretationResponse(rawText)
      setDisplayText(parsed.mainReport)
      setPalaceInterpretations(parsed.palaceDetails)
      setAiInterpretation(parsed.mainReport)
      addChartInterpretationHistory({
        title: `${birthInfo.year}-${birthInfo.month}-${birthInfo.day} 命盘解读`,
        content: parsed.mainReport,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '解读失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [chart, birthInfo, provider, currentSettings, enableThinking, enableWebSearch, searchApiKey, setAiInterpretation, setPalaceInterpretations, addChartInterpretationHistory])

  const handleSelectHistory = useCallback((entry: InterpretationHistoryEntry) => {
    setError(null)
    setLoading(false)
    setDisplayText(entry.content)
    setPalaceInterpretations({})
    if (entry.kind === 'chart') {
      setAiInterpretation(entry.content)
    }
  }, [setAiInterpretation, setPalaceInterpretations])

  if (!chart) return null

  return (
    <div className="space-y-4">
      <div
        className="
          relative p-6 lg:p-8
          bg-gradient-to-br from-white/[0.04] to-transparent
          backdrop-blur-xl border border-white/[0.08] rounded-2xl
          shadow-[0_8px_32px_rgba(0,0,0,0.3)]
        "
      >
        {/* 顶部发光线 */}
        <div
          className="
            absolute top-0 left-1/2 -translate-x-1/2
            w-1/3 h-px
            bg-gradient-to-r from-transparent via-gold/50 to-transparent
          "
        />

        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="
              text-xl lg:text-2xl font-semibold
              bg-gradient-to-r from-gold via-gold-light to-gold
              bg-clip-text text-transparent
            "
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            AI 命盘解读
          </h2>
          <Button
            onClick={handleInterpret}
            disabled={loading}
            size="sm"
            variant="gold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-night border-t-transparent rounded-full animate-spin" />
                解读中
              </span>
            ) : '开始解读'}
          </Button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 rounded-lg bg-misfortune/10 text-misfortune text-sm mb-4 border border-misfortune/20">
            {error}
          </div>
        )}

        {/* 待解读提示 */}
        {!currentSettings.apiKey && !displayText && (
          <div className="text-text-muted text-sm py-8 text-center">
            <div className="text-3xl mb-3 opacity-30">☆</div>
            将优先使用 Cloudflare 端 API；也可在设置中填写自己的 API Key。
          </div>
        )}

        {/* 解读内容 - 书法字体 + Markdown 渲染 */}
        {displayText && (
          <div
            className="
              prose prose-invert max-w-none
              text-text-secondary text-lg lg:text-xl leading-loose
            "
            style={{ fontFamily: 'var(--font-brush)' }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {displayText}
            </ReactMarkdown>

          </div>
        )}

        {/* 加载占位 */}
        {loading && !displayText && (
          <div className="flex items-center justify-center gap-3 text-text-muted py-12">
            <div className="w-5 h-5 border-2 border-star border-t-transparent rounded-full animate-spin" />
            <span>正在分析命盘...</span>
          </div>
        )}
      </div>

      <InterpretationHistory
        title="命盘解读历史"
        entries={chartInterpretationHistory}
        onSelect={handleSelectHistory}
      />
    </div>
  )
}
