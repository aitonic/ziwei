import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPalaceDetailMessages,
  parsePalaceDetailsJson,
} from '../src/lib/palace-interpretation.ts'

test('builds a separate JSON-only palace detail prompt', () => {
  const messages = buildPalaceDetailMessages({
    birthInfo: { year: 1990, month: 1, day: 1, gender: 'male' },
    fiveElementsClass: '水二局',
    context: '命宫：紫微、天府',
  })

  assert.equal(messages.length, 2)
  assert.equal(messages[0].role, 'system')
  assert.match(messages[0].content, /PALACE_DETAIL_JSON_V1/)
  assert.match(messages[0].content, /valid JSON/)
  assert.doesNotMatch(messages[0].content, /紫微命盘综合批注/)
  assert.equal(messages[1].role, 'user')
  assert.match(messages[1].content, /# Variable Input/)
})

test('parses valid palace JSON and normalizes palace names', () => {
  const details = parsePalaceDetailsJson(JSON.stringify({
    palaces: {
      命宮: '命宫细解',
      财帛宫: '财帛细解',
      其他: 'ignore',
    },
  }))

  assert.deepEqual(details, {
    命宫: '命宫细解',
    财帛宫: '财帛细解',
  })
})

test('rejects palace JSON without usable palace content', () => {
  assert.throws(
    () => parsePalaceDetailsJson('{"palaces":{"命宫":"   "}}'),
    /No palace details/
  )
})
