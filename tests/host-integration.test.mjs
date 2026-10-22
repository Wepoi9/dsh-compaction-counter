import assert from 'node:assert/strict'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SessionId, SessionLogOffset, SessionSeq } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { compactionCountDefinition } from '../index.js'

test('the unit drives over a real session log', async () => {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  ctx.sessionProjections.register(compactionCountDefinition)

  const session = ctx.sessions.create(SessionId('compaction-count-host'))
  session.append('turn/start', { turn: 1 })
  session.append('compaction/start', { compactionId: 'c1', turn: 1 })
  session.append('compaction/summary', {
    compactionId: 'c1',
    summary: [],
    shadowedRange: { start: SessionSeq(0), end: SessionSeq(0) },
    shadowedSeqs: [SessionSeq(0)],
    shadowedTokenCount: 10,
    provider: 'test',
    model: 'test',
  })
  session.append('compaction/end', { compactionId: 'c1', turn: 1 })

  const snapshot = ctx.sessionProjections.snapshot(session)
  assert.deepEqual(snapshot.values.compactionCount, { count: 1 })
  assert.equal(snapshot.asOfSeq, session.seq - 1)
  await ctx.fiber.dispose()
})

test('a forked session counts only its own compactions', async () => {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  ctx.sessionProjections.register(compactionCountDefinition)

  const parent = ctx.sessions.create(SessionId('compaction-count-parent'))
  parent.append('compaction/summary', {
    compactionId: 'c1',
    summary: [],
    shadowedRange: { start: SessionSeq(0), end: SessionSeq(0) },
    shadowedSeqs: [SessionSeq(0)],
    shadowedTokenCount: 10,
    provider: 'test',
    model: 'test',
  })
  const child = ctx.sessions.fork(parent)
  assert.equal(ctx.sessionProjections.stateOf(parent, 'compactionCount').count, 1)
  assert.equal(ctx.sessionProjections.stateOf(child, 'compactionCount').count, 0)
  assert.equal(child.inheritedEventCount, SessionLogOffset(parent.seq))
  await ctx.fiber.dispose()
})
