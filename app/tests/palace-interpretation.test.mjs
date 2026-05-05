import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPalaceDetailMessages,
  parsePalaceDetailsJson,
  toPalaceDetailName,
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
  assert.match(messages[0].content, /宫位主题/)
  assert.match(messages[0].content, /星曜依据/)
  assert.match(messages[0].content, /吉凶判断/)
  assert.match(messages[0].content, /行动建议/)
  assert.match(messages[0].content, /at least two concrete chart factors/)
  assert.doesNotMatch(messages[0].content, /紫微命盘综合批注/)
  assert.equal(messages[1].role, 'user')
  assert.match(messages[1].content, /# Variable Input/)
})

test('parses complete palace JSON and normalizes palace names', () => {
  const details = parsePalaceDetailsJson(JSON.stringify({
    palaces: {
      命宮: '命宫细解',
      兄弟宫: '兄弟细解',
      夫妻宫: '夫妻细解',
      子女宫: '子女细解',
      财帛宫: '财帛细解',
      疾厄宫: '疾厄细解',
      迁移宫: '迁移细解',
      交友宫: '交友细解',
      官禄宫: '官禄细解',
      田宅宫: '田宅细解',
      福德宫: '福德细解',
      父母宫: '父母细解',
    },
  }))

  assert.equal(Object.keys(details).length, 12)
  assert.equal(details.命宫, '命宫细解')
  assert.equal(details.财帛宫, '财帛细解')
})

test('rejects palace JSON without every required palace', () => {
  assert.throws(
    () => parsePalaceDetailsJson('{"palaces":{"命宫":"命宫细解"}}'),
    /Missing palace details/
  )
})

test('normalizes chart palace names to detail keys', () => {
  assert.equal(toPalaceDetailName('夫妻'), '夫妻宫')
  assert.equal(toPalaceDetailName('财帛'), '财帛宫')
  assert.equal(toPalaceDetailName('仆役'), '交友宫')
  assert.equal(toPalaceDetailName('命宮'), '命宫')
})
