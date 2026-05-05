import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTH_COOKIE_NAME,
  buildAuthCookie,
  buildClearAuthCookie,
  hasAuthCookie,
  isPublicPath,
  isValidPassword,
  sanitizeNextPath,
} from '../functions/auth.js'
import worker from '../worker.js'

test('accepts matching auth password only', () => {
  assert.equal(isValidPassword('star-pass', 'star-pass'), true)
  assert.equal(isValidPassword('wrong-pass', 'star-pass'), false)
  assert.equal(isValidPassword('star-pass', ''), false)
})

test('detects auth cookie among multiple cookies', () => {
  assert.equal(hasAuthCookie(`${AUTH_COOKIE_NAME}=1; theme=dark`), true)
  assert.equal(hasAuthCookie(`theme=dark; ${AUTH_COOKIE_NAME}=1`), true)
  assert.equal(hasAuthCookie(`${AUTH_COOKIE_NAME}=0`), false)
  assert.equal(hasAuthCookie(''), false)
})

test('builds ninety day secure auth cookie', () => {
  assert.equal(
    buildAuthCookie(),
    `${AUTH_COOKIE_NAME}=1; Max-Age=7776000; Path=/; HttpOnly; Secure; SameSite=Lax`
  )
})

test('builds expired auth cookie', () => {
  assert.equal(
    buildClearAuthCookie(),
    `${AUTH_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`
  )
})

test('allows login and asset paths without an auth cookie', () => {
  assert.equal(isPublicPath('/login'), true)
  assert.equal(isPublicPath('/favicon.svg'), true)
  assert.equal(isPublicPath('/assets/app.js'), true)
  assert.equal(isPublicPath('/'), false)
  assert.equal(isPublicPath('/chart'), false)
})

test('keeps login redirects inside the site', () => {
  assert.equal(sanitizeNextPath('/chart?tab=fortune'), '/chart?tab=fortune')
  assert.equal(sanitizeNextPath('https://example.com'), '/')
  assert.equal(sanitizeNextPath('//example.com'), '/')
  assert.equal(sanitizeNextPath(''), '/')
})

test('worker redirects private pages to login without auth cookie', async () => {
  const response = await worker.fetch(
    new Request('https://ziwei.example/chart?tab=fortune'),
    createEnv()
  )

  assert.equal(response.status, 302)
  assert.equal(response.headers.get('Location'), 'https://ziwei.example/login?next=%2Fchart%3Ftab%3Dfortune')
})

test('worker serves assets when auth cookie is present', async () => {
  const env = createEnv()
  const response = await worker.fetch(
    new Request('https://ziwei.example/', {
      headers: { Cookie: `${AUTH_COOKIE_NAME}=1` },
    }),
    env
  )

  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'asset response')
  assert.equal(env.assetRequests, 1)
})

test('worker sets auth cookie after correct password', async () => {
  const body = new FormData()
  body.set('password', 'star-pass')
  body.set('next', '/chart')

  const response = await worker.fetch(
    new Request('https://ziwei.example/login', { method: 'POST', body }),
    createEnv()
  )

  assert.equal(response.status, 302)
  assert.equal(response.headers.get('Location'), '/chart')
  assert.equal(response.headers.get('Set-Cookie'), buildAuthCookie())
})

test('worker proxies LLM requests with server env key', async () => {
  const env = createEnv()
  env.LLM_PROVIDER = 'kimi'
  env.LLM_API_KEY = 'server-key'
  env.FETCH = async (url, init) => {
    assert.equal(url, 'https://api.moonshot.cn/v1/chat/completions')
    assert.equal(init.headers.Authorization, 'Bearer server-key')
    return new Response('data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n')
  }

  const response = await worker.fetch(
    new Request('https://ziwei.example/api/llm', {
      method: 'POST',
      headers: {
        Cookie: `${AUTH_COOKIE_NAME}=1`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hi' }],
      }),
    }),
    env
  )

  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'hello')
})

test('worker ignores custom defaults when provider is overridden', async () => {
  const env = createEnv()
  env.LLM_PROVIDER = 'deepseek'
  env.LLM_API_KEY = 'server-key'
  env.LLM_MODEL = 'gpt-5.5'
  env.LLM_BASE_URL = 'https://cpa.aitonic.me/v1'
  env.LLM_ENABLE_THINKING = 'true'
  env.LLM_ENABLE_WEB_SEARCH = 'true'
  env.FETCH = async (url, init) => {
    assert.equal(url, 'https://api.deepseek.com/v1/chat/completions')
    const body = JSON.parse(init.body)
    assert.equal(body.model, 'deepseek-v4-pro')
    assert.equal(body.tools, undefined)
    return new Response('data: {"choices":[{"delta":{"content":"deepseek"}}]}\n\ndata: [DONE]\n')
  }

  const response = await worker.fetch(
    new Request('https://ziwei.example/api/llm', {
      method: 'POST',
      headers: {
        Cookie: `${AUTH_COOKIE_NAME}=1`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hi' }],
      }),
    }),
    env
  )

  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'deepseek')
})

test('worker rejects LLM requests without server key', async () => {
  const response = await worker.fetch(
    new Request('https://ziwei.example/api/llm', {
      method: 'POST',
      headers: { Cookie: `${AUTH_COOKIE_NAME}=1` },
      body: JSON.stringify({ messages: [] }),
    }),
    createEnv()
  )

  assert.equal(response.status, 500)
  assert.equal(await response.text(), 'Server LLM is not configured')
})

function createEnv() {
  const env = {
    AUTH_PASSWORD: 'star-pass',
    assetRequests: 0,
    ASSETS: {
      fetch() {
        env.assetRequests += 1
        return new Response('asset response')
      },
    },
  }

  return env
}
