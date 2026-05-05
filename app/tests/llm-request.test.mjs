import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOpenAICompatibleRequestBody } from '../src/lib/llm.ts'

test('builds OpenAI compatible JSON response format requests', () => {
  const body = buildOpenAICompatibleRequestBody(
    {
      provider: 'deepseek',
      apiKey: 'key',
      responseFormat: { type: 'json_object' },
    },
    [{ role: 'user', content: 'hi' }]
  )

  assert.deepEqual(body.response_format, { type: 'json_object' })
})
