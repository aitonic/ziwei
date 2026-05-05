/* ============================================================
   AI 解读组件
   丝滑流式输出 + 书法字体 + Markdown 渲染
   ============================================================ */

import { useState, useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChartStore, useSettingsStore, useContentCacheStore } from '@/stores'
import { extractKnowledge, buildPromptContext } from '@/knowledge'
import { streamChat, type LLMConfig } from '@/lib/llm'
import {
  buildInterpretationMessages,
  shouldRestoreCachedInterpretation,
} from '@/lib/ai-interpretation'
import { Button } from '@/components/ui'

/* ------------------------------------------------------------
   字符输出速度（毫秒/字符）
   ------------------------------------------------------------ */

const CHAR_INTERVAL = 35

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
  const { aiInterpretation, setAiInterpretation } = useContentCacheStore()
  const currentSettings = providerSettings[provider]

  // 显示的文本（逐字输出）
  const [displayText, setDisplayText] = useState('')
  // 完整文本（缓冲区）
  const fullTextRef = useRef('')
  // 当前显示位置
  const displayIndexRef = useRef(0)
  // 定时器
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // 是否正在接收（ref 用于定时器闭包）
  const loadingRef = useRef(false)
  const [loading, setLoading] = useState(false)
  // 是否正在输出动画
  const [animating, setAnimating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 组件挂载时，如果有缓存则直接显示
  useEffect(() => {
    if (shouldRestoreCachedInterpretation(aiInterpretation, displayText, loading)) {
      const cachedText = aiInterpretation || ''
      setDisplayText(cachedText)
      fullTextRef.current = cachedText
      displayIndexRef.current = cachedText.length
    }
  }, [aiInterpretation, displayText, loading])

  /* ------------------------------------------------------------
     均匀输出字符的定时器
     ------------------------------------------------------------ */

  const startAnimation = useCallback(() => {
    if (timerRef.current) return

    setAnimating(true)
    timerRef.current = setInterval(() => {
      if (displayIndexRef.current < fullTextRef.current.length) {
        displayIndexRef.current++
        setDisplayText(fullTextRef.current.slice(0, displayIndexRef.current))
      } else if (!loadingRef.current) {
        // 输出完成且不再加载
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        setAnimating(false)
      }
    }, CHAR_INTERVAL)
  }, [])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  /* ------------------------------------------------------------
     开始解读
     ------------------------------------------------------------ */

  const handleInterpret = useCallback(async () => {
    if (!chart || !birthInfo) return

    // 重置状态
    loadingRef.current = true
    setLoading(true)
    setError(null)
    setAiInterpretation('')
    setDisplayText('')
    fullTextRef.current = ''
    displayIndexRef.current = 0

    // 清理旧定时器
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

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

      // 启动均匀输出动画
      startAnimation()

      // 流式接收，写入缓冲区
      for await (const token of streamChat(config, messages)) {
        fullTextRef.current += token
      }

      // 保存到全局缓存
      setAiInterpretation(fullTextRef.current)
    } catch (err) {
      setError(err instanceof Error ? err.message : '解读失败，请重试')
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [chart, birthInfo, provider, currentSettings, enableThinking, enableWebSearch, searchApiKey, startAnimation, setAiInterpretation])

  if (!chart) return null

  return (
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

          {/* 光标指示器 */}
          {animating && (
            <span className="inline-block w-0.5 h-5 bg-gold/80 animate-pulse ml-0.5 align-middle" />
          )}
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
  )
}
