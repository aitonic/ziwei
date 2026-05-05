import {
  buildAuthCookie,
  hasAuthCookie,
  isPublicPath,
  isValidPassword,
  sanitizeNextPath,
} from './functions/auth.js'

function renderLoginPage({ nextPath = '/', hasError = false } = {}) {
  const escapedNextPath = nextPath.replaceAll('"', '&quot;')
  const errorMarkup = hasError
    ? '<p class="error">Password is incorrect.</p>'
    : ''

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>紫微知道 · Access</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #090916;
        color: #f7f2ff;
      }
      * { box-sizing: border-box; }
      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.28), transparent 32%),
          radial-gradient(circle at 80% 30%, rgba(212, 175, 55, 0.18), transparent 28%),
          #090916;
      }
      main {
        width: min(100%, 400px);
        padding: 28px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        background: rgba(18, 18, 35, 0.78);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
        backdrop-filter: blur(18px);
      }
      h1 {
        margin: 0 0 6px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 28px;
        letter-spacing: 0;
      }
      p {
        margin: 0;
        color: rgba(247, 242, 255, 0.66);
        font-size: 14px;
        line-height: 1.6;
      }
      form {
        margin-top: 24px;
        display: grid;
        gap: 14px;
      }
      label {
        display: grid;
        gap: 8px;
        color: rgba(247, 242, 255, 0.78);
        font-size: 13px;
      }
      input {
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 10px;
        padding: 12px 13px;
        background: rgba(255, 255, 255, 0.06);
        color: #fff;
        font-size: 16px;
        outline: none;
      }
      input:focus {
        border-color: rgba(212, 175, 55, 0.75);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.16);
      }
      button {
        border: 0;
        border-radius: 10px;
        padding: 12px 16px;
        background: linear-gradient(135deg, #7c3aed, #d4af37);
        color: #fff;
        font-weight: 700;
        font-size: 15px;
        cursor: pointer;
      }
      .error {
        color: #fecaca;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>紫微知道</h1>
      <p>Enter the access password to continue.</p>
      <form method="post" action="/login">
        <input type="hidden" name="next" value="${escapedNextPath}" />
        <label>
          Password
          <input name="password" type="password" autocomplete="current-password" required autofocus />
        </label>
        ${errorMarkup}
        <button type="submit">Enter</button>
      </form>
    </main>
  </body>
</html>`
}

function redirectToLogin(request) {
  const url = new URL(request.url)
  const nextPath = sanitizeNextPath(`${url.pathname}${url.search}`)
  const loginUrl = new URL('/login', url)
  loginUrl.searchParams.set('next', nextPath)

  return Response.redirect(loginUrl.toString(), 302)
}

const PROVIDER_CONFIGS = {
  kimi: {
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2-0905-preview',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-3.0-flash',
  },
  claude: {
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-opus-4-5-20251124',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-v4-pro',
  },
  custom: {
    baseUrl: '',
    defaultModel: '',
  },
}

function readServerLLMConfig(env, clientConfig = {}) {
  const provider = env.LLM_PROVIDER || clientConfig.provider || 'kimi'
  const keyPrefix = provider.toUpperCase()
  const isCustomProvider = provider === 'custom'

  return {
    provider,
    apiKey: env.LLM_API_KEY || env[`${keyPrefix}_API_KEY`] || '',
    baseUrl: isCustomProvider ? env.LLM_BASE_URL || clientConfig.baseUrl || '' : '',
    model: isCustomProvider ? env.LLM_MODEL || clientConfig.model || '' : '',
    responseFormat: clientConfig.responseFormat,
    enableThinking: isCustomProvider ? readBoolean(env.LLM_ENABLE_THINKING, clientConfig.enableThinking) : false,
    enableWebSearch: isCustomProvider ? readBoolean(env.LLM_ENABLE_WEB_SEARCH, clientConfig.enableWebSearch) : false,
  }
}

function readBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return Boolean(fallback)
  return value === true || value === 'true' || value === '1'
}

async function handleLLMProxy(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await request.json()
  const config = readServerLLMConfig(env, body.config)

  if (!config.apiKey) {
    return new Response('Server LLM is not configured', { status: 500 })
  }

  const stream = await streamServerLLM(config, body.messages || [], env.FETCH || fetch)
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

async function streamServerLLM(config, messages, fetcher) {
  const encoder = new TextEncoder()
  const source = await requestProviderStream(config, messages, fetcher)

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const token of source) {
          controller.enqueue(encoder.encode(token))
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
}

function requestProviderStream(config, messages, fetcher) {
  if (config.provider === 'gemini') {
    return streamGeminiFromServer(config, messages, fetcher)
  }

  if (config.provider === 'claude') {
    return streamClaudeFromServer(config, messages, fetcher)
  }

  return streamOpenAIFromServer(config, messages, fetcher)
}

async function* streamOpenAIFromServer(config, messages, fetcher) {
  const providerConfig = PROVIDER_CONFIGS[config.provider] || PROVIDER_CONFIGS.kimi
  let useModel = config.model || providerConfig.defaultModel

  if (config.enableThinking && !config.model) {
    if (config.provider === 'deepseek') useModel = 'deepseek-v3.2-speciale'
    if (config.provider === 'kimi') useModel = 'kimi-k2-thinking'
  }

  const requestBody = {
    model: useModel,
    messages,
    stream: !config.responseFormat,
  }

  if (config.responseFormat) {
    requestBody.response_format = config.responseFormat
    requestBody.max_tokens = 8000
  }

  if (config.enableWebSearch && config.provider === 'kimi') {
    requestBody.tools = [{
      type: 'builtin_function',
      function: { name: '$web_search' },
    }]
  }

  const response = await fetcher(`${config.baseUrl || providerConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`)
  }

  if (config.responseFormat) {
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (content) yield content
    return
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') return

      try {
        const json = JSON.parse(data)
        const content = json.choices?.[0]?.delta?.content
        if (content) yield content
      } catch {
        // Ignore malformed stream chunks.
      }
    }
  }
}

async function* streamGeminiFromServer(config, messages, fetcher) {
  const providerConfig = PROVIDER_CONFIGS.gemini
  let modelName = config.model || providerConfig.defaultModel
  if (config.enableThinking && !config.model) {
    modelName = 'gemini-3-pro-preview'
  }

  const contents = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }))
  const systemMessage = messages.find((message) => message.role === 'system')

  const requestBody = {
    contents,
    systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
  }

  if (config.enableWebSearch) {
    requestBody.tools = [{ google_search: {} }]
  }

  const response = await fetcher(
    `${config.baseUrl || providerConfig.baseUrl}/models/${modelName}:streamGenerateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    try {
      const matches = buffer.match(/\{[^{}]*"text"\s*:\s*"[^"]*"[^{}]*\}/g)
      if (!matches) continue

      for (const match of matches) {
        const json = JSON.parse(match)
        if (json.text) yield json.text
        buffer = buffer.replace(match, '')
      }
    } catch {
      // Keep reading until JSON chunks are complete.
    }
  }
}

async function* streamClaudeFromServer(config, messages, fetcher) {
  const providerConfig = PROVIDER_CONFIGS.claude
  const systemMessage = messages.find((message) => message.role === 'system')?.content || ''
  const chatMessages = messages.filter((message) => message.role !== 'system')
  const requestBody = {
    model: config.model || providerConfig.defaultModel,
    max_tokens: config.enableThinking ? 16000 : 4096,
    system: systemMessage,
    messages: chatMessages,
    stream: true,
  }

  if (config.enableThinking) {
    requestBody.thinking = {
      type: 'enabled',
      budget_tokens: 10000,
    }
  }

  const response = await fetcher(`${config.baseUrl || providerConfig.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    throw new Error(`Claude API Error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue

      try {
        const json = JSON.parse(line.slice(6))
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
          yield json.delta.text || ''
        }
      } catch {
        // Ignore malformed stream chunks.
      }
    }
  }
}

async function handleLoginPost(request, env) {
  const formData = await request.formData()
  const password = String(formData.get('password') || '')
  const nextPath = sanitizeNextPath(String(formData.get('next') || '/'))
  const url = new URL(request.url)

  if (!isValidPassword(password, env.AUTH_PASSWORD)) {
    url.search = ''
    url.searchParams.set('next', nextPath)
    url.searchParams.set('error', '1')
    return Response.redirect(url.toString(), 302)
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: nextPath,
      'Set-Cookie': buildAuthCookie(),
    },
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/login') {
      if (request.method === 'POST') {
        return handleLoginPost(request, env)
      }

      const nextPath = sanitizeNextPath(url.searchParams.get('next') || '/')
      const hasError = url.searchParams.get('error') === '1'
      return new Response(renderLoginPage({ nextPath, hasError }), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    if (url.pathname === '/api/llm') {
      if (!hasAuthCookie(request.headers.get('Cookie') || '')) {
        return redirectToLogin(request)
      }

      return handleLLMProxy(request, env)
    }

    if (isPublicPath(url.pathname) || hasAuthCookie(request.headers.get('Cookie') || '')) {
      return env.ASSETS.fetch(request)
    }

    return redirectToLogin(request)
  },
}
