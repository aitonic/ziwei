import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildInterpretationMessages,
  parseInterpretationResponse,
  shouldRestoreCachedInterpretation,
} from '../src/lib/ai-interpretation.ts'

test('does not restore cached interpretation while a new run is starting', () => {
  assert.equal(shouldRestoreCachedInterpretation('old', '', true), false)
})

test('restores cached interpretation only when display is empty and idle', () => {
  assert.equal(shouldRestoreCachedInterpretation('old', '', false), true)
  assert.equal(shouldRestoreCachedInterpretation('old', 'current', false), false)
  assert.equal(shouldRestoreCachedInterpretation('', '', false), false)
})

test('builds a stable cache-friendly prompt shape', () => {
  const messages = buildInterpretationMessages({
    birthInfo: { year: 1990, month: 1, day: 1, gender: 'male' },
    fiveElementsClass: '水二局',
    context: '命宫：紫微、天府',
  })

  assert.equal(messages.length, 2)
  assert.equal(messages[0].role, 'system')
  assert.match(messages[0].content, /PROMPT_CACHE_STABLE_V1/)
  assert.match(messages[0].content, /先按固定章节成文/)
  assert.match(messages[0].content, /<main_report>/)
  assert.match(messages[0].content, /<palace name="命宫">/)
  assert.equal(messages[1].role, 'user')
  assert.match(messages[1].content, /## 基本信息/)
  assert.match(messages[1].content, /## 命盘资料/)
})

test('parses main report and palace details from structured response', () => {
  const parsed = parseInterpretationResponse(`
<main_report>
## 紫微命盘综合批注
主报告内容
</main_report>
<palace_details>
<palace name="命宫">命宫细解</palace>
<palace name="财帛宫">财帛细解</palace>
</palace_details>
`)

  assert.equal(parsed.mainReport, '## 紫微命盘综合批注\n主报告内容')
  assert.deepEqual(parsed.palaceDetails, {
    命宫: '命宫细解',
    财帛宫: '财帛细解',
  })
})

test('falls back to raw text when structured main report is missing', () => {
  const parsed = parseInterpretationResponse('plain report')

  assert.equal(parsed.mainReport, 'plain report')
  assert.deepEqual(parsed.palaceDetails, {})
})
