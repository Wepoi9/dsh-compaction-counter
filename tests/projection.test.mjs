import assert from 'node:assert/strict'
import test from 'node:test'
import { compactionCountDefinition } from '../index.js'

const { init, apply, wire } = compactionCountDefinition

const header = { version: 4, id: 's1', createdAt: 0, isSeeded: false }

test('counts one compaction per summary event', () => {
  let state = init(header, 0)
  state = apply(state, { type: 'turn/start', seq: 0, time: 0, data: { turn: 1 } })
  state = apply(state, { type: 'compaction/summary', seq: 1, time: 1, data: {} })
  state = apply(state, { type: 'compaction/end', seq: 2, time: 2, data: {} })
  assert.equal(state.count, 1)
  assert.equal(wire.view(state).count, 1)
})

test('ignores prunes, failures and unrelated events', () => {
  let state = init(header, 0)
  state = apply(state, { type: 'compaction/start', seq: 0, time: 0, data: {} })
  state = apply(state, { type: 'compaction/end', seq: 1, time: 1, data: { error: 'boom' } })
  state = apply(state, { type: 'compaction/prune', seq: 2, time: 2, data: {} })
  state = apply(state, { type: 'tool/result', seq: 3, time: 3, data: {} })
  assert.equal(state.count, 0)
})

test('keeps the same reference for uninteresting events', () => {
  const state = init(header, 0)
  assert.equal(apply(state, { type: 'turn/start', seq: 0, time: 0, data: {} }), state)
})

test('does not count compactions inherited from the fork parent', () => {
  // The parent compacted at seq 1; the child inherits the prefix through seq 2.
  let state = init(header, 3)
  state = apply(state, { type: 'compaction/summary', seq: 1, time: 1, data: {} })
  assert.equal(state.count, 0)
  state = apply(state, { type: 'compaction/summary', seq: 3, time: 3, data: {} })
  assert.equal(state.count, 1)
})

test('the wire view carries the count alone', () => {
  const state = apply(init(header, 5), { type: 'compaction/summary', seq: 5, time: 5, data: {} })
  assert.deepEqual(wire.view(state), { count: 1 })
  assert.deepEqual(wire.viewSchema.parse(wire.view(state)), { count: 1 })
})

test('the state schema accepts the folded state and rejects a malformed one', () => {
  const state = init(header, 0)
  assert.deepEqual(compactionCountDefinition.stateSchema.parse(state), { count: 0, floor: 0 })
  assert.throws(() => compactionCountDefinition.stateSchema.parse({ count: -1, floor: 0 }))
  assert.throws(() => compactionCountDefinition.stateSchema.parse({ count: 1.5, floor: 0 }))
  assert.throws(() => compactionCountDefinition.stateSchema.parse({ count: 1, floor: 0, extra: 1 }))
})
