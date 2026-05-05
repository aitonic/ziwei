import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HISTORY_LIMIT,
  createHistoryEntry,
  prependHistoryEntry,
  removeHistoryEntry,
} from '../src/lib/interpretation-history.ts'

test('keeps latest interpretation history first and limits to five', () => {
  let history = []

  for (let index = 1; index <= 6; index++) {
    history = prependHistoryEntry(history, createHistoryEntry({
      kind: 'chart',
      title: `第 ${index} 次`,
      content: `content ${index}`,
      createdAt: index,
    }))
  }

  assert.equal(history.length, HISTORY_LIMIT)
  assert.deepEqual(history.map((entry) => entry.title), ['第 6 次', '第 5 次', '第 4 次', '第 3 次', '第 2 次'])
})

test('does not add empty interpretation content', () => {
  const history = prependHistoryEntry([], createHistoryEntry({
    kind: 'fortune',
    title: '2026 年运势',
    content: '   ',
    year: 2026,
    createdAt: 1,
  }))

  assert.deepEqual(history, [])
})

test('does not add consecutive duplicate interpretation content', () => {
  const first = createHistoryEntry({
    kind: 'chart',
    title: '命盘解读',
    content: 'same content',
    createdAt: 1,
  })
  const duplicate = createHistoryEntry({
    kind: 'chart',
    title: '命盘解读',
    content: 'same content',
    createdAt: 2,
  })

  const history = prependHistoryEntry([first], duplicate)

  assert.equal(history.length, 1)
  assert.equal(history[0].id, first.id)
})

test('keeps same title when interpretation content changes', () => {
  const first = createHistoryEntry({
    kind: 'chart',
    title: '命盘解读',
    content: 'old content',
    createdAt: 1,
  })
  const second = createHistoryEntry({
    kind: 'chart',
    title: '命盘解读',
    content: 'new content',
    createdAt: 2,
  })

  const history = prependHistoryEntry([first], second)

  assert.deepEqual(history.map((entry) => entry.content), ['new content', 'old content'])
})

test('keeps chart and yearly histories independently', () => {
  const chartHistory = prependHistoryEntry([], createHistoryEntry({
    kind: 'chart',
    title: '命盘解读',
    content: 'chart',
    createdAt: 1,
  }))
  const yearlyHistory = prependHistoryEntry([], createHistoryEntry({
    kind: 'fortune',
    title: '2026 年运势',
    content: 'fortune',
    year: 2026,
    createdAt: 2,
  }))

  assert.equal(chartHistory.length, 1)
  assert.equal(yearlyHistory.length, 1)
  assert.equal(chartHistory[0].kind, 'chart')
  assert.equal(yearlyHistory[0].kind, 'fortune')
})

test('allows chart history without palace detail JSON', () => {
  const history = prependHistoryEntry([], createHistoryEntry({
    kind: 'chart',
    title: '命盘解读',
    content: 'main report only',
    createdAt: 1,
  }))

  assert.equal(history.length, 1)
  assert.equal(history[0].content, 'main report only')
  assert.equal(history[0].palaceDetails, undefined)
})

test('removes one history entry by id', () => {
  const first = createHistoryEntry({
    kind: 'chart',
    title: 'first',
    content: 'first content',
    createdAt: 1,
  })
  const second = createHistoryEntry({
    kind: 'chart',
    title: 'second',
    content: 'second content',
    createdAt: 2,
  })

  const history = removeHistoryEntry([second, first], first.id)

  assert.deepEqual(history.map((entry) => entry.id), [second.id])
})
