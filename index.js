import { z } from 'zod'

/**
 * The `compactionCount` projection unit: a pure fold of the durable
 * `compaction/summary` events into the number of successful compactions of
 * one session.
 *
 * `compaction/summary` is appended inside the synchronous commit step,
 * together with the replacement body, so a failed attempt closes with
 * `compaction/end` carrying an `error` and never reaches that step. A
 * tool-result prune appends `compaction/prune`, which this unit ignores.
 *
 * The fold starts at the session's own inherited cut. A forked session
 * inherits its parent's log prefix, and the compactions that happened before
 * the fork are the parent's history, not this session's — the unit counts only
 * the compactions this session performed.
 */

const countSchema = z.number().int().nonnegative()

const stateSchema = z.object({
  count: countSchema,
  /** Seq of the fork-inherited prefix; compactions below it belong to the parent. */
  floor: z.number().int(),
}).strict()

const viewSchema = z.object({
  count: countSchema,
}).strict()

/**
 * Fold one committed event into the compaction count.
 *
 * @param {object} state - the state covering all prior events.
 * @param {object} event - the next committed session event.
 * @returns the next state; the same reference when the event is not a summary.
 */
function applyCount(state, event) {
  if (event.type !== 'compaction/summary') return state
  if (event.seq < state.floor) return state
  return { count: state.count + 1, floor: state.floor }
}

/**
 * The client view: the count alone. The floor is host state and never leaves it.
 *
 * @param {object} state - the current state.
 * @returns the whole current value for this unit's key.
 */
function view(state) {
  return { count: state.count }
}

/** The `compactionCount` unit registered on `ctx.sessionProjections`. */
export const compactionCountDefinition = {
  key: 'compactionCount',
  stateVersion: 1,
  stateSchema,
  init: (_header, inheritedEventCount) => ({
    count: 0,
    floor: Number(inheritedEventCount),
  }),
  apply: applyCount,
  wire: {
    viewSchema,
    view,
  },
}

export const name = 'dsh-compaction-counter'

export const inject = ['sessionProjections']

/**
 * Register the compaction-count unit.
 *
 * Registration may perform asynchronous work, so the plugin awaits the ready
 * handle before the composition publishes consumers. The returned value is a
 * callable thenable; the plugin must neither return nor yield it.
 *
 * @param {object} ctx - the host cordis context.
 * @returns the completion of registration.
 */
export async function apply(ctx) {
  await ctx.sessionProjections.register(compactionCountDefinition)
}
